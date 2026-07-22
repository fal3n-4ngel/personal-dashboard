import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { Credentials, FirebaseWebConfig, getCredentials, parseFirebaseConfig } from "./credentials";
import { ApiError } from "./errors";
import { cacheGet, cacheSet } from "./cache";
import { redis } from "./redis";

export interface AuthedUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

// Everything a data-layer call needs: which Firebase project to talk to, and
// the caller's verified identity plus their raw ID token. The token is passed
// through to Firestore so security rules are enforced as this user.
export interface Session {
  creds: Credentials;
  config: FirebaseWebConfig;
  uid: string;
  idToken: string;
  user: AuthedUser;
}

const TOKEN_CACHE_TTL = 5 * 60 * 1000; // well under Firebase's 1h token lifetime

// Fixed-window limiter for failed token verifications, keyed by client IP.
// In-memory, so per-instance on serverless — still blunts brute-force attempts.
const AUTH_FAILURE_LIMIT = 20;
const AUTH_FAILURE_WINDOW = 10 * 60 * 1000;
const authFailures = new Map<string, { count: number; windowStart: number }>();

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function checkAuthFailures(ip: string) {
  const entry = authFailures.get(ip);
  if (!entry) return;
  if (Date.now() - entry.windowStart > AUTH_FAILURE_WINDOW) {
    authFailures.delete(ip);
    return;
  }
  if (entry.count >= AUTH_FAILURE_LIMIT) {
    throw new ApiError(429, "Too many failed authentication attempts. Try again later.");
  }
}

function recordAuthFailure(ip: string) {
  const now = Date.now();
  const entry = authFailures.get(ip);
  if (!entry || now - entry.windowStart > AUTH_FAILURE_WINDOW) {
    authFailures.set(ip, { count: 1, windowStart: now });
  } else {
    entry.count++;
  }
  // Opportunistic cleanup so the map can't grow unbounded.
  if (authFailures.size > 10_000) {
    for (const [key, value] of authFailures) {
      if (now - value.windowStart > AUTH_FAILURE_WINDOW) authFailures.delete(key);
    }
  }
}

// Verifies a Firebase ID token against the Identity Toolkit API and returns the
// account it belongs to. Results are cached briefly (keyed by project + token
// hash) so every API call doesn't cost an extra Google round-trip.
export async function verifyIdToken(config: FirebaseWebConfig, idToken: string): Promise<AuthedUser> {
  const tokenHash = createHash("sha256").update(idToken).digest("hex");
  const cacheKey = `auth:${config.projectId}:${tokenHash}`;
  const cached = await cacheGet<AuthedUser>(cacheKey);
  if (cached) return cached;

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(config.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!res.ok) {
    throw new ApiError(401, "Invalid or expired authentication token.");
  }

  const data = await res.json();
  const account = data.users?.[0];
  if (!account?.localId) {
    throw new ApiError(401, "Invalid or expired authentication token.");
  }

  const user: AuthedUser = {
    uid: account.localId,
    email: account.email || null,
    displayName: account.displayName || null,
  };
  await cacheSet(cacheKey, user, TOKEN_CACHE_TTL);
  return user;
}

// Exchanges a permanent Firebase Refresh Token for a fresh ID token on-demand.
// Allows long-lived API tokens for LLM integrations, custom GPTs, and automated scripts.
export async function refreshIdToken(
  config: FirebaseWebConfig,
  refreshToken: string
): Promise<{ idToken: string; user: AuthedUser }> {
  const tokenHash = createHash("sha256").update(refreshToken).digest("hex");
  const cacheKey = `refresh:${config.projectId}:${tokenHash}`;
  const cached = await cacheGet<{ idToken: string; user: AuthedUser }>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", refreshToken);

  const res = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(config.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    }
  );

  if (!res.ok) {
    throw new ApiError(401, "Invalid or expired authentication token.");
  }

  const data = await res.json();
  const idToken = data.id_token || data.access_token;
  const uid = data.user_id;

  if (!idToken || !uid) {
    throw new ApiError(401, "Invalid or expired authentication token.");
  }

  const user: AuthedUser = {
    uid,
    email: null,
    displayName: null,
  };

  const result = { idToken, user };
  await cacheSet(cacheKey, result, 4 * 60 * 1000);
  return result;
}

// Authenticates an API request: resolves credentials, extracts the bearer
// token, and verifies it. Supports both short-lived ID tokens and permanent API keys/refresh tokens. Throws ApiError (401/429/400) on failure.
export async function requireUser(req: NextRequest): Promise<Session> {
  const ip = clientIp(req);
  checkAuthFailures(ip);

  const creds = await getCredentials(req);
  const config = parseFirebaseConfig(creds);

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Missing or invalid Authorization header. Expected 'Bearer <token>'.");
  }
  let token = authHeader.substring(7).trim();
  if (token.startsWith("phub_")) {
    token = token.replace(/^phub_/, "");
  }
  if (!token) {
    throw new ApiError(401, "Missing bearer token.");
  }

async function trackGptMetrics(req: NextRequest, uid: string, email: string | null) {
  try {
    if (!redis) return;
    const userAgent = req.headers.get("user-agent") || "";
    if (userAgent.toLowerCase().includes("chatgpt") || userAgent.toLowerCase().includes("openai")) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const identifier = email || uid;
      
      await Promise.all([
        redis.incr("metrics:gpt:total_calls"),
        redis.incr(`metrics:gpt:daily_calls:${todayStr}`),
        redis.sadd("metrics:gpt:users_set", identifier),
        redis.hset("metrics:gpt:user_last_active", { [identifier]: Date.now().toString() })
      ]);
    }
  } catch (e) {
    console.error("Failed to track GPT metrics in Redis:", e);
  }
}

  let user: AuthedUser;
  let resolvedIdToken = token;

  try {
    user = await verifyIdToken(config, token);
  } catch {
    try {
      const refreshResult = await refreshIdToken(config, token);
      user = refreshResult.user;
      resolvedIdToken = refreshResult.idToken;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) recordAuthFailure(ip);
      throw err;
    }
  }

  // Track ChatGPT requests asynchronously
  trackGptMetrics(req, user.uid, user.email).catch(() => {});

  return { creds, config, uid: user.uid, idToken: resolvedIdToken, user };
}
