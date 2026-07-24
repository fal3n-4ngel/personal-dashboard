"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { Auth, GoogleAuthProvider as GoogleAuthProviderClass, signInWithPopup as signInWithPopupFn } from "firebase/auth";
import { SITE_URL } from "@/lib/site";
import { useOrigin } from "@/hooks/useOrigin";

interface AgentUser {
  displayName: string | null;
  email: string;
}

interface AuthApi {
  auth: Auth;
  GoogleAuthProvider: typeof GoogleAuthProviderClass;
  signInWithPopup: typeof signInWithPopupFn;
}

export default function AssistantIntegrationPage() {
  const [authApi, setAuthApi] = useState<AuthApi | null>(null);
  const [user, setUser] = useState<AgentUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const origin = useOrigin();
  const [copied, setCopied] = useState<string>("");
  const [tokenBusy, setTokenBusy] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    (async () => {
      try {
        const res = await fetch("/api/auth/config");
        if (!res.ok) throw new Error("Could not load Firebase configuration.");
        const config = await res.json();

        const { initializeApp, getApps } = await import("firebase/app");
        const { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } = await import("firebase/auth");

        const appName = "dashboard-client";
        const apps = getApps();
        const app = apps.find((a) => a.name === appName) || initializeApp(config, appName);
        const auth = getAuth(app);
        setAuthApi({ auth, GoogleAuthProvider, signInWithPopup });

        unsubscribe = onAuthStateChanged(auth, (fbUser) => {
          setUser(fbUser ? { displayName: fbUser.displayName, email: fbUser.email || "" } : null);
          setAuthLoading(false);
        });
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : "Could not load Firebase configuration.");
        setAuthLoading(false);
      }
    })();

    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const schemaUrl = `${origin || SITE_URL}/api/openapi.json`;
  const poeWebhookUrl = `${origin || SITE_URL}/api/assistant/poe?key=${
    authApi?.auth?.currentUser?.refreshToken || "YOUR_PERMANENT_API_KEY"
  }`;

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((prev) => (prev === key ? "" : prev)), 2500);
    } catch {
      setAuthError("Clipboard access was blocked — copy manually instead.");
    }
  }

  async function copyToken() {
    if (!authApi?.auth?.currentUser) return;
    setTokenBusy(true);
    try {
      const token = await authApi.auth.currentUser.getIdToken(true);
      await copyText("token", token);
    } catch {
      setAuthError("Could not refresh the token. Try signing in again.");
    } finally {
      setTokenBusy(false);
    }
  }

  async function copyPermanentKey() {
    if (!authApi?.auth?.currentUser) return;
    setTokenBusy(true);
    try {
      const key = authApi.auth.currentUser.refreshToken;
      await copyText("perm_key", key);
    } catch {
      setAuthError("Could not retrieve key. Try signing in again.");
    } finally {
      setTokenBusy(false);
    }
  }

  async function signIn() {
    if (!authApi) return;
    try {
      await authApi.signInWithPopup(authApi.auth, new authApi.GoogleAuthProvider());
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Sign-in failed.");
    }
  }

  const agentInstructions = `You are my personal dashboard assistant. You manage two things through the API actions:

1. Expenses — when I mention spending money ("spent 450 on lunch", "uber was 320"), log it with createExpense. Infer a sensible category (Food, Transport, Rent, Shopping, Entertainment, Health, Other) and reuse existing ones from listExpenseCategories when they fit. Amounts are INR. Use today's date unless I say otherwise. When I ask about my spending, use listExpenses with filters and summarise clearly.

2. Watchlist — when I mention wanting to watch something, add it with addWatchlistItem (status plan_to_watch). Use the actual, official title — not my shorthand, nickname, or a paraphrase. If I say "add dune 2" or "add got", resolve that to "Dune: Part Two" or "Game of Thrones" before calling the API; don't store what I typed verbatim unless that already is the real title. ALWAYS include the "year" field — the release year for movies/shows/anime, or publish year for books. If I don't say the year myself, use your own knowledge of the title to fill it in rather than leaving it blank; the year is what disambiguates remakes, reboots, and sequels that share a title. When I say I watched/finished episodes, update progress or status with updateWatchlistItem — look up the item id via listWatchlistItems first. Ratings are out of 10.

Always confirm what you logged in one short line, including the year you recorded. Never invent ids — fetch them first.`;

  const examplePrompts = [
    "Log 450 for lunch at the office cafe",
    "I spent 1,200 on groceries and 300 on an auto today",
    "How much did I spend on food this month?",
    "Add Dune: Part Two to my watchlist",
    "I just finished episode 8 of Frieren — update it",
    "What am I currently watching?",
  ];

  const CODE_CLASS = "rounded-[5px] bg-bg-secondary px-[7px] py-0.5 font-mono text-xs break-all";
  const BENTO_CARD = "rounded-card border border-border-subtle bg-bg-card p-6 shadow-subtle";
  const BTN_PRIMARY = "rounded-md border border-text-primary bg-text-primary text-[13px] font-medium text-white transition-all duration-200 hover:border-[#2e2d27] hover:bg-[#2e2d27] disabled:cursor-not-allowed disabled:opacity-50";
  const BTN_SECONDARY = "rounded-md border border-border-subtle bg-transparent text-[13px] font-medium text-text-primary transition-all duration-200 hover:bg-bg-primary disabled:cursor-not-allowed disabled:opacity-50";

  const stepBadge = (n: number) => (
    <span className="inline-flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full bg-text-primary text-[13px] font-bold text-white">{n}</span>
  );

  return (
    <div className="min-h-screen bg-bg-primary px-5 py-10">
      <div className="mx-auto flex max-w-195 flex-col gap-5">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 22H22L12 2ZM12 6L18.8 19.6H5.2L12 6Z" fill="var(--text-primary)"/></svg>
            <span className="text-[19px] font-bold tracking-[-0.5px]">PHub Dashboard</span>
          </div>
          <Link href="/" className="mb-0 flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-text-secondary no-underline transition-all duration-200 hover:bg-bg-primary hover:text-text-primary">← Back to dashboard</Link>
        </div>

        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.5px]">ChatGPT Setup Guide</h1>
          <p className="mt-2 text-sm leading-[1.6] text-text-secondary">
            Connect your dashboard to a Custom GPT on the GPT Store. If you prefer a native chat assistant, it is available as a floating chat bubble in the bottom right corner of the dashboard page!
          </p>
        </div>

        {authError && (
          <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3.5 py-2.5 text-xs text-[#dc2626]">
            {authError}
          </div>
        )}

        {/* Recommended Option: Public Custom GPT */}
        <div className="rounded-card border border-border-subtle bg-white p-6 shadow-subtle flex flex-col gap-4 border-l-4 border-l-text-primary">
          <div className="flex items-center justify-between">
            <span className="inline-block rounded bg-[#eae8e0] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-text-secondary w-fit">
              RECOMMENDED (EASIEST)
            </span>
          </div>
          <h2 className="text-[17px] font-bold font-serif leading-tight">Use the Official Public Custom GPT</h2>
          <p className="text-[13px] leading-[1.6] text-text-secondary">
            Connect to the pre-built, secure **PHub Dashboard Assistant** on the GPT Store. 
            It uses secure OAuth 2.0 to link directly to your account. No copy-pasting API keys required!
          </p>
          <a
            href="https://chatgpt.com/g/g-6a60b01e38c8819187662d1e42c6bee7-phub-dashboard-public"
            target="_blank"
            rel="noopener noreferrer"
            className={`${BTN_PRIMARY} px-5 py-3 text-center no-underline inline-block w-fit cursor-pointer`}
          >
            Open in ChatGPT
          </a>
        </div>

        <div className="border-t border-border-subtle my-2 text-center text-xs font-semibold text-text-secondary tracking-wider uppercase font-mono">
          — OR SETUP CUSTOM AGENTS / SELF-HOSTED —
        </div>

        {/* Step 1 */}
        <div className={`${BENTO_CARD} flex gap-4`}>
          {stepBadge(1)}
          <div className="min-w-0 flex-1">
            <h2 className="mb-1.5 text-[15px] font-semibold">Create a Custom GPT or AI Agent</h2>
            <p className="text-[13px] leading-[1.7] text-text-secondary">
              In ChatGPT (under Explore GPTs) or your preferred AI Agent builder (e.g. Coze, Dify), initiate a new custom assistant. Keep sharing set to <strong>Only me</strong> — this agent will hold a token to your personal data.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className={`${BENTO_CARD} flex gap-4`}>
          {stepBadge(2)}
          <div className="min-w-0 flex-1">
            <h2 className="mb-1.5 text-[15px] font-semibold">Import the API schema (or set up Poe webhook)</h2>
            <p className="mb-3 text-[13px] leading-[1.7] text-text-secondary">
              For <strong>ChatGPT Actions</strong> (Custom GPTs) or agent platforms, choose to import a schema from a URL and paste the link below:
            </p>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className={CODE_CLASS}>{schemaUrl}</span>
              <button onClick={() => copyText("schema", schemaUrl)} className={`${BTN_SECONDARY} px-3 py-1.5 text-xs`}>
                {copied === "schema" ? "✓ Copied" : "Copy URL"}
              </button>
            </div>
            
            <p className="mb-3 text-[13px] leading-[1.7] text-text-secondary border-t border-border-subtle pt-3.5">
              For <strong>Poe Server Bots</strong>, copy the Server Webhook URL below and paste it in Poe's <strong>Server URL</strong> settings:
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className={CODE_CLASS}>{poeWebhookUrl}</span>
              <button onClick={() => copyText("poe", poeWebhookUrl)} className={`${BTN_SECONDARY} px-3 py-1.5 text-xs`}>
                {copied === "poe" ? "✓ Copied" : "Copy Poe URL"}
              </button>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className={`${BENTO_CARD} flex gap-4`}>
          {stepBadge(3)}
          <div className="min-w-0 flex-1">
            <h2 className="mb-1.5 text-[15px] font-semibold">Authenticate your Agent</h2>
            <p className="mb-3 text-[13px] leading-[1.7] text-text-secondary">
              Configure how the custom assistant authenticates with your dashboard:
            </p>

            <div className="flex flex-col gap-4">
              {/* Option A: OAuth */}
              <div className="border border-border-subtle rounded-lg p-4 bg-bg-primary/20">
                <h3 className="font-serif text-[13px] font-bold text-text-primary mb-1">Option A: Configure OAuth 2.0 (Recommended)</h3>
                <p className="text-[11.5px] text-text-secondary leading-relaxed mb-3">
                  Under Authentication, select <strong>OAuth</strong> and configure these endpoints:
                </p>
                <table className="w-full text-[11px] font-mono text-text-secondary border-collapse">
                  <tbody>
                    <tr>
                      <td className="pr-3 pb-1 font-bold text-text-primary">Auth URL:</td>
                      <td className="pb-1 break-all">${origin || SITE_URL}/api/oauth/authorize</td>
                    </tr>
                    <tr>
                      <td className="pr-3 font-bold text-text-primary">Token URL:</td>
                      <td className="break-all">${origin || SITE_URL}/api/oauth/token</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Option B: API Token (Manual fallback) */}
              <div className="border border-border-subtle rounded-lg p-4 bg-bg-primary/20 min-h-[82px] flex flex-col justify-center">
                <h3 className="font-serif text-[13px] font-bold text-text-primary mb-1">Option B: Permanent API Key (Manual copy-paste)</h3>
                <p className="text-[11.5px] text-text-secondary leading-relaxed mb-3">
                  Under Authentication, select <strong>API Key</strong> ➔ <strong>Bearer</strong>, and paste your key.
                </p>
                
                {authLoading ? (
                  <p className="text-xs text-text-muted">Checking sign-in…</p>
                ) : user ? (
                  <div className="flex flex-col gap-2.5">
                    <p className="text-xs text-text-secondary">
                      Signed in as <strong>{user.displayName || user.email}</strong>
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={copyPermanentKey} disabled={tokenBusy} className={`${BTN_PRIMARY} px-3 py-1.5 text-xs`}>
                        {tokenBusy ? "Generating…" : copied === "perm_key" ? "✓ Permanent Key Copied" : "Copy Permanent API Key"}
                      </button>
                      <button onClick={copyToken} disabled={tokenBusy} className={`${BTN_SECONDARY} px-3 py-1.5 text-xs`}>
                        {tokenBusy ? "Generating…" : copied === "token" ? "✓ Token Copied" : "Copy 1-Hour ID Token"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={signIn} disabled={!authApi} className={`${BTN_PRIMARY} px-4 py-2 text-xs`}>
                    Sign in to retrieve API Key
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className={`${BENTO_CARD} flex gap-4`}>
          {stepBadge(4)}
          <div className="min-w-0 flex-1">
            <h2 className="mb-1.5 text-[15px] font-semibold">Teach the Agent how to behave</h2>
            <p className="mb-3 text-[13px] leading-[1.7] text-text-secondary">
              Paste this into the agent&apos;s <strong>Instructions</strong> or <strong>System Instructions</strong> field:
            </p>
            <pre className="max-h-65 overflow-y-auto rounded-lg bg-bg-secondary p-3.5 font-mono text-[11.5px] leading-[1.6] whitespace-pre-wrap wrap-break-word text-text-primary">{agentInstructions}</pre>
            <button onClick={() => copyText("instructions", agentInstructions)} className={`${BTN_SECONDARY} mt-2.5 px-3 py-1.5 text-xs`}>
              {copied === "instructions" ? "✓ Copied" : "Copy instructions"}
            </button>
          </div>
        </div>

        {/* Step 5 */}
        <div className={`${BENTO_CARD} flex gap-4`}>
          {stepBadge(5)}
          <div className="min-w-0 flex-1">
            <h2 className="mb-1.5 text-[15px] font-semibold">Try it out</h2>
            <p className="mb-3 text-[13px] leading-[1.7] text-text-secondary">
              Save the agent and start chatting. Things that should just work:
            </p>
            <div className="flex flex-col gap-2">
              {examplePrompts.map((prompt) => (
                <div key={prompt} className="rounded-lg bg-bg-secondary px-3 py-2 text-[12.5px] text-text-primary">
                  &ldquo;{prompt}&rdquo;
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Self-hosting note */}
        <div className={BENTO_CARD}>
          <span className="mb-2.5 block font-mono text-[10px] font-semibold tracking-[0.8px] text-text-secondary uppercase">Self-hosting?</span>
          <p className="text-[13px] leading-[1.7] text-text-secondary">
            Deploy this app with your own <span className={CODE_CLASS}>FIREBASE_CONFIG</span> environment
            variable (your Firebase Web App config JSON) and publish the matching Firestore security
            rules from <span className={CODE_CLASS}>firestore.rules</span>. Then follow the same steps above
            against your own domain — the schema URL adapts automatically.
          </p>
        </div>

        <p className="pb-5 text-center text-[11px] text-text-muted">
          The raw schema is at <a href="/api/openapi.json" target="_blank" rel="noopener noreferrer" className="text-text-secondary">/api/openapi.json</a>.
        </p>
      </div>
    </div>
  );
}
