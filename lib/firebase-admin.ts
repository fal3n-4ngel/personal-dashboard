// Firebase Admin SDK access — used exclusively by cron routes, which need
// to fan out across every registered user. Everywhere else in this app,
// Firestore is accessed via REST with the caller's own ID token (see
// lib/firebase.ts) so per-user security rules are the enforcement
// mechanism; there is no other privileged path. This module is the one
// deliberate exception, gated by CRON_SECRET at the route level, and it
// bypasses Firestore rules entirely — treat every export here as
// unrestricted, cross-user access.
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { encrypt, decrypt } from "./encryption";
import { ApiError } from "./errors";
import {
  encryptAsset,
  decryptAsset,
  encryptValuationHistory,
  decryptValuationHistory,
  type ExpenseRecord,
  type SubscriptionRecord,
  type PortfolioRecord,
  type InvestmentAsset,
  type WatchlistItem,
  type DailyRecommendation,
} from "./firebase";

let adminApp: App | null = null;

function getAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApps()[0]!;
    return adminApp;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new ApiError(500, "FIREBASE_SERVICE_ACCOUNT is not configured on this server.");
  }

  let parsed: { project_id?: string; client_email?: string; private_key?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ApiError(500, "FIREBASE_SERVICE_ACCOUNT is not valid JSON.");
  }
  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new ApiError(500, "FIREBASE_SERVICE_ACCOUNT is missing project_id, client_email, or private_key.");
  }

  adminApp = initializeApp({
    credential: cert({
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      // Service-account JSON stores real newlines, but env vars commonly
      // flatten them to the literal two-character sequence "\n".
      privateKey: parsed.private_key.replace(/\\n/g, "\n"),
    }),
  });
  return adminApp;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export interface AdminUser {
  uid: string;
  email: string;
}

// Every registered Auth user with a known email — the fan-out target list
// for every cron. Paginated since listUsers() caps at 1000 per page.
export async function listAllUsers(): Promise<AdminUser[]> {
  const auth = getAdminAuth();
  const users: AdminUser[] = [];
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const u of page.users) {
      if (u.email) users.push({ uid: u.uid, email: u.email });
    }
    pageToken = page.pageToken;
  } while (pageToken);
  return users;
}

export async function adminListExpenses(uid: string): Promise<ExpenseRecord[]> {
  const db = getAdminDb();
  const snap = await db.collection("expenses").where("userId", "==", uid).get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    const title = decrypt(data.title || "");
    const category = decrypt(data.category || "");
    const notes = decrypt(data.notes || "");
    const amountStr = typeof data.amount === "string" ? decrypt(data.amount) : String(data.amount ?? "");
    const amountParsed = amountStr ? parseFloat(amountStr) : null;
    return {
      id: doc.id,
      title: title || "Untitled",
      amount: amountParsed === null || isNaN(amountParsed) ? null : amountParsed,
      category: category || null,
      date: (data.date as string) || null,
      notes: notes || null,
      createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
    };
  });
}

export async function adminListSubscriptions(uid: string): Promise<SubscriptionRecord[]> {
  const db = getAdminDb();
  const snap = await db.collection("subscriptions").where("userId", "==", uid).get();
  return snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: (data.name as string) || "Untitled",
        cost: typeof data.cost === "number" ? data.cost : 0,
        billingCycle: (data.billingCycle as SubscriptionRecord["billingCycle"]) || "monthly",
        nextBillingDate: (data.nextBillingDate as string) || "",
        icon: (data.icon as string) || null,
        createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function adminGetPortfolio(uid: string): Promise<PortfolioRecord | null> {
  const db = getAdminDb();
  const doc = await db.collection("portfolios").doc(uid).get();
  if (!doc.exists) return null;
  const data = doc.data() || {};
  const assetsRaw = Array.isArray(data.assets) ? (data.assets as Record<string, unknown>[]) : [];
  const assets: InvestmentAsset[] = assetsRaw.map(decryptAsset);
  const valHistoryRaw =
    data.valuationHistory && typeof data.valuationHistory === "object" ? (data.valuationHistory as Record<string, unknown>) : {};
  return {
    id: uid,
    assets,
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
    valuationHistory: decryptValuationHistory(valHistoryRaw),
  };
}

export async function adminUpdatePortfolioValuationHistory(uid: string, valuationHistory: Record<string, number>): Promise<void> {
  const db = getAdminDb();
  await db.collection("portfolios").doc(uid).set({ valuationHistory: encryptValuationHistory(valuationHistory), updatedAt: Date.now() }, { merge: true });
}

// Re-saves a user's portfolio assets through the same encryption used by the
// REST write path — used by the admin encryption-migration route to force
// any legacy plaintext holdings to be encrypted at rest.
export async function adminUpdatePortfolioAssets(uid: string, assets: InvestmentAsset[]): Promise<void> {
  const db = getAdminDb();
  await db.collection("portfolios").doc(uid).set({ assets: assets.map(encryptAsset), updatedAt: Date.now() }, { merge: true });
}

// Re-encrypts and re-saves a single expense document in place — the
// migration equivalent of updateExpense() in lib/firebase.ts, but callable
// across every user's documents rather than just the caller's own.
export async function adminReEncryptExpense(
  uid: string,
  id: string,
  entry: { title: string; amount: number | null; category: string | null; notes: string | null }
): Promise<void> {
  const db = getAdminDb();
  await db.collection("expenses").doc(id).set(
    {
      userId: uid,
      title: encrypt(entry.title),
      amount: entry.amount !== null ? encrypt(String(entry.amount)) : null,
      category: entry.category ? encrypt(entry.category) : null,
      notes: entry.notes ? encrypt(entry.notes) : null,
    },
    { merge: true }
  );
}

export async function adminListWatchlist(uid: string): Promise<WatchlistItem[]> {
  const db = getAdminDb();
  const doc = await db.collection("watchlists").doc(uid).get();
  if (!doc.exists) return [];
  const data = doc.data() || {};
  const itemsMap = data.items && typeof data.items === "object" ? (data.items as Record<string, WatchlistItem>) : {};
  return Object.entries(itemsMap).map(([id, item]) => ({ ...item, id }));
}

export async function adminSaveDailyRecommendation(
  uid: string,
  type: string,
  date: string,
  recommendation: DailyRecommendation
): Promise<void> {
  const db = getAdminDb();
  const expireAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  await db
    .collection("recommendations")
    .doc(uid)
    .collection("entries")
    .doc(`${type}_${date}`)
    .set({ ...recommendation, expireAt });
}
