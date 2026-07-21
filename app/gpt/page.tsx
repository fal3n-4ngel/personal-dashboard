"use client";

import React, { useEffect, useState } from "react";
import { SITE_URL } from "@/lib/site";

/* ─── ChatGPT Custom GPT integration guide ───
 * Walks through connecting the dashboard API to a Custom GPT via Actions:
 * import the OpenAPI schema, then authenticate with a Firebase ID token.
 * Requires sign-in so the user can copy a fresh token straight from here. */

interface GptUser {
  displayName: string | null;
  email: string;
}

export default function GptIntegrationPage() {
  const [authApi, setAuthApi] = useState<any>(null);
  const [user, setUser] = useState<GptUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<string>("");
  const [tokenBusy, setTokenBusy] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);

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
      } catch (err: any) {
        setAuthError(err.message);
        setAuthLoading(false);
      }
    })();

    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const schemaUrl = `${origin || SITE_URL}/api/openapi.json`;

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((prev) => (prev === key ? "" : prev)), 2500);
    } catch {
      setAuthError("Clipboard access was blocked — copy manually instead.");
    }
  }

  // Always mint a fresh token (force refresh) so the full ~1h lifetime is
  // available after pasting it into the GPT's auth settings.
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

  async function signIn() {
    if (!authApi) return;
    try {
      await authApi.signInWithPopup(authApi.auth, new authApi.GoogleAuthProvider());
    } catch (e: any) {
      setAuthError(e.message);
    }
  }

  const gptInstructions = `You are my personal dashboard assistant. You manage two things through the API actions:

1. Expenses — when I mention spending money ("spent 450 on lunch", "uber was 320"), log it with createExpense. Infer a sensible category (Food, Transport, Rent, Shopping, Entertainment, Health, Other) and reuse existing ones from listExpenseCategories when they fit. Amounts are INR. Use today's date unless I say otherwise. When I ask about my spending, use listExpenses with filters and summarise clearly.

2. Watchlist — when I mention wanting to watch something, add it with addWatchlistItem (status plan_to_watch). When I say I watched/finished episodes, update progress or status with updateWatchlistItem — look up the item id via listWatchlistItems first. Ratings are out of 10.

Always confirm what you logged in one short line. Never invent ids — fetch them first.`;

  const examplePrompts = [
    "Log 450 for lunch at the office cafe",
    "I spent 1,200 on groceries and 300 on an auto today",
    "How much did I spend on food this month?",
    "Add Dune: Part Two to my watchlist",
    "I just finished episode 8 of Frieren — update it",
    "What am I currently watching?",
  ];

  const codeStyle: React.CSSProperties = {
    fontFamily: "monospace",
    fontSize: "12px",
    backgroundColor: "var(--bg-secondary)",
    padding: "2px 7px",
    borderRadius: "5px",
    wordBreak: "break-all",
  };

  const stepBadge = (n: number) => (
    <span style={{
      width: "26px", height: "26px", borderRadius: "50%", flexShrink: 0,
      backgroundColor: "var(--text-primary)", color: "#fff",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: "13px", fontWeight: 700,
    }}>{n}</span>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)", padding: "40px 20px" }}>
      <div style={{ maxWidth: "780px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 22H22L12 2ZM12 6L18.8 19.6H5.2L12 6Z" fill="var(--text-primary)"/></svg>
            <span style={{ fontSize: "19px", fontWeight: 700, letterSpacing: "-0.5px" }}>Personal Hub</span>
          </div>
          <a href="/" className="nav-link" style={{ marginBottom: 0 }}>← Back to dashboard</a>
        </div>

        <div>
          <h1 style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "-0.5px" }}>Connect to ChatGPT</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "8px", lineHeight: 1.6 }}>
            Turn this dashboard into a Custom GPT action so you can log expenses and manage your
            watchlist by chatting — &ldquo;spent 450 on lunch&rdquo;, &ldquo;add Dune to my watchlist&rdquo;, done.
          </p>
        </div>

        {authError && (
          <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#dc2626" }}>
            {authError}
          </div>
        )}

        {/* Step 1 */}
        <div className="bento-card" style={{ display: "flex", gap: "16px" }}>
          {stepBadge(1)}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "6px" }}>Create a Custom GPT</h2>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7 }}>
              In ChatGPT go to <strong>Explore GPTs → Create</strong> (a ChatGPT Plus/Pro plan is required),
              open the <strong>Configure</strong> tab, give it a name like <em>&ldquo;My Dashboard&rdquo;</em>, and keep
              sharing set to <strong>Only me</strong> — this GPT will hold a token to your personal data.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bento-card" style={{ display: "flex", gap: "16px" }}>
          {stepBadge(2)}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "6px" }}>Import the API schema</h2>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "12px" }}>
              Scroll to <strong>Actions → Create new action</strong>, choose <strong>Import from URL</strong>,
              and paste the schema URL below. ChatGPT will list all the expense and watchlist operations automatically.
            </p>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <span style={codeStyle}>{schemaUrl}</span>
              <button onClick={() => copyText("schema", schemaUrl)} className="btn-secondary" style={{ fontSize: "12px", padding: "6px 12px" }}>
                {copied === "schema" ? "✓ Copied" : "Copy URL"}
              </button>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bento-card" style={{ display: "flex", gap: "16px" }}>
          {stepBadge(3)}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "6px" }}>Authenticate with your token</h2>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "12px" }}>
              In the action&apos;s <strong>Authentication</strong> settings choose <strong>API Key</strong>, set
              Auth Type to <strong>Bearer</strong>, and paste your personal token. The API only ever reads or
              writes data belonging to the account this token was issued for.
            </p>

            {authLoading ? (
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Checking sign-in…</p>
            ) : user ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Signed in as <strong>{user.displayName || user.email}</strong>
                </p>
                <div>
                  <button onClick={copyToken} disabled={tokenBusy} className="btn-primary" style={{ fontSize: "12px", padding: "8px 16px" }}>
                    {tokenBusy ? "Generating…" : copied === "token" ? "✓ Token copied" : "Copy fresh ID token"}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={signIn} disabled={!authApi} className="btn-primary" style={{ fontSize: "12px", padding: "8px 16px" }}>
                Sign in to get your token
              </button>
            )}

            <div style={{ marginTop: "14px", backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#92400e", lineHeight: 1.6 }}>
              <strong>Tokens expire after about 1 hour.</strong> When your GPT starts getting
              &ldquo;Unauthorized&rdquo; errors, come back here, copy a fresh token, and paste it into the
              action&apos;s API-key field again. Treat the token like a password — don&apos;t share the GPT.
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="bento-card" style={{ display: "flex", gap: "16px" }}>
          {stepBadge(4)}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "6px" }}>Teach the GPT how to behave</h2>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "12px" }}>
              Paste this into the GPT&apos;s <strong>Instructions</strong> field (tweak to taste):
            </p>
            <pre style={{
              fontFamily: "monospace", fontSize: "11.5px", lineHeight: 1.6,
              backgroundColor: "var(--bg-secondary)", borderRadius: "8px",
              padding: "14px", whiteSpace: "pre-wrap", wordBreak: "break-word",
              color: "var(--text-primary)", maxHeight: "260px", overflowY: "auto",
            }}>{gptInstructions}</pre>
            <button onClick={() => copyText("instructions", gptInstructions)} className="btn-secondary" style={{ fontSize: "12px", padding: "6px 12px", marginTop: "10px" }}>
              {copied === "instructions" ? "✓ Copied" : "Copy instructions"}
            </button>
          </div>
        </div>

        {/* Step 5 */}
        <div className="bento-card" style={{ display: "flex", gap: "16px" }}>
          {stepBadge(5)}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "6px" }}>Try it out</h2>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "12px" }}>
              Save the GPT and start chatting. Things that should just work:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {examplePrompts.map((prompt) => (
                <div key={prompt} style={{ fontSize: "12.5px", backgroundColor: "var(--bg-secondary)", borderRadius: "8px", padding: "8px 12px", color: "var(--text-primary)" }}>
                  &ldquo;{prompt}&rdquo;
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Self-hosting note */}
        <div className="bento-card">
          <span className="label-mono" style={{ display: "block", marginBottom: "10px" }}>Self-hosting?</span>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7 }}>
            Deploy this app with your own <span style={codeStyle}>FIREBASE_CONFIG</span> environment
            variable (your Firebase Web App config JSON) and publish the matching Firestore security
            rules from <span style={codeStyle}>firestore.rules</span>. Then follow the same steps above
            against your own domain — the schema URL adapts automatically.
          </p>
        </div>

        <p style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center", paddingBottom: "20px" }}>
          The raw schema is at <a href="/api/openapi.json" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-secondary)" }}>/api/openapi.json</a>.
        </p>
      </div>
    </div>
  );
}
