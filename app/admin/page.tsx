"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FirebaseUser } from "@/types";
import { Shield, Trash2, Bell, Mail, RefreshCw, BarChart2, ArrowLeft } from "lucide-react";

interface FirebaseAuthModule {
  auth: any;
  GoogleAuthProvider: any;
  signInWithPopup: any;
  signOut: any;
}

export default function AdminPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [firebaseAuth, setFirebaseAuth] = useState<FirebaseAuthModule | null>(null);
  
  // Admin stats
  const [stats, setStats] = useState<{
    expenses: number;
    subscriptions: number;
    watchlist: number;
    portfolioAssets: number;
    portfolioValue: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Operation states
  const [cronRunning, setCronRunning] = useState<string | null>(null);
  const [flushLoading, setFlushLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // 1. Initialize Firebase Auth
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    import("firebase/app").then(async ({ initializeApp, getApps }) => {
      try {
        const res = await fetch("/api/auth/config");
        if (!res.ok) throw new Error("Failed to load auth config");
        const config = await res.json();
        const app = getApps().length ? getApps()[0] : initializeApp(config);

        const { getAuth, GoogleAuthProvider, signInWithPopup, signOut } = await import("firebase/auth");
        const auth = getAuth(app);
        setFirebaseAuth({ auth, GoogleAuthProvider, signInWithPopup, signOut });

        unsubscribe = auth.onAuthStateChanged(async (fbUser: any) => {
          if (fbUser) {
            const idToken = await fbUser.getIdToken();
            setUser({
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName,
              photoURL: fbUser.photoURL,
              idToken,
            });
          } else {
            setUser(null);
          }
          setAuthLoading(false);
        });
      } catch (err) {
        console.error("Auth initialization failed:", err);
        setAuthLoading(false);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // 2. Fetch Stats once authenticated and verified
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "adiad.dev@gmail.com";
  const isAdmin = user && user.email === adminEmail;

  useEffect(() => {
    if (!isAdmin) return;

    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.idToken}`,
        };

        const [expRes, subRes, watchRes, portRes] = await Promise.all([
          fetch("/api/expenses", { headers }),
          fetch("/api/subscriptions", { headers }),
          fetch("/api/watchlist", { headers }),
          fetch("/api/portfolio", { headers }),
        ]);

        const expenses = expRes.ok ? await expRes.json() : [];
        const subscriptions = subRes.ok ? await subRes.json() : [];
        const watchlist = watchRes.ok ? await watchRes.json() : [];
        const portfolio = portRes.ok ? await portRes.json() : null;

        const portAssets = Array.isArray(portfolio) 
          ? portfolio 
          : (portfolio && Array.isArray(portfolio.assets) ? portfolio.assets : []);

        const portValue = portAssets.reduce((sum: number, asset: any) => sum + (Number(asset.amount) || 0), 0);

        setStats({
          expenses: Array.isArray(expenses) ? expenses.length : 0,
          subscriptions: Array.isArray(subscriptions) ? subscriptions.length : 0,
          watchlist: Array.isArray(watchlist) ? watchlist.length : (watchlist.items ? watchlist.items.length : 0),
          portfolioAssets: portAssets.length,
          portfolioValue: portValue,
        });
      } catch (err) {
        console.error("Failed to load admin stats:", err);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [isAdmin, user?.idToken]);

  // Login handler
  const login = () => {
    if (firebaseAuth) {
      firebaseAuth.signInWithPopup(firebaseAuth.auth, new firebaseAuth.GoogleAuthProvider());
    }
  };

  // Logout handler
  const logout = () => {
    if (firebaseAuth) {
      firebaseAuth.signOut(firebaseAuth.auth);
    }
  };

  // Cron trigger handler
  const triggerCron = async (type: string) => {
    if (!user) return;
    setCronRunning(type);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/cron", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.idToken}`,
        },
        body: JSON.stringify({ triggerType: type }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({
          text: `Successfully triggered ${type.replace(/_/g, " ")} email!`,
          type: "success",
        });
      } else {
        throw new Error(data.error || "Failed to trigger cron");
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Failed to complete operation.", type: "error" });
    } finally {
      setCronRunning(null);
    }
  };

  // Cache flush handler
  const flushCache = async () => {
    if (!user) return;
    setFlushLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/cache-flush", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.idToken}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ text: "Redis Cache cleared successfully!", type: "success" });
      } else {
        throw new Error(data.error || "Failed to flush cache");
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Cache flush failed.", type: "error" });
    } finally {
      setFlushLoading(false);
    }
  };

  /* ─── Loading State ─── */
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f3ec]">
        <p className="text-sm text-text-secondary font-mono">Loading PHub Admin Panel…</p>
      </div>
    );
  }

  /* ─── Login Guard ─── */
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f3ec]">
        <div className="flex w-[400px] flex-col gap-6 rounded-card border border-border-subtle bg-white p-8 text-center shadow-subtle">
          <Shield className="mx-auto h-12 w-12 text-[#b3666b]" />
          <div>
            <h1 className="font-serif text-2xl font-bold text-text-primary">Admin Access</h1>
            <p className="mt-2 text-xs text-text-secondary">Please sign in with your administrative account to continue.</p>
          </div>
          <button
            onClick={login}
            className="rounded-md border border-text-primary bg-text-primary py-2.5 text-xs font-semibold text-white transition-all hover:bg-[#2e2d27]"
          >
            Sign In with Google
          </button>
          <Link href="/" className="text-xs text-text-secondary hover:text-text-primary flex items-center justify-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  /* ─── Authorization Guard ─── */
  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f3ec]">
        <div className="flex w-[400px] flex-col gap-6 rounded-card border border-border-subtle bg-[#fef2f2] p-8 text-center shadow-subtle">
          <Shield className="mx-auto h-12 w-12 text-[#dc2626]" />
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#991b1b]">Access Denied</h1>
            <p className="mt-2 text-xs text-[#991b1b]/80">Your account ({user.email}) is not authorized to access the admin panel.</p>
          </div>
          <div className="flex flex-col gap-2.5">
            <button
              onClick={logout}
              className="rounded-md border border-[#dc2626] bg-[#dc2626] py-2.5 text-xs font-semibold text-white transition-all hover:bg-[#b91c1c]"
            >
              Sign Out
            </button>
            <Link href="/" className="text-xs text-text-secondary hover:text-text-primary flex items-center justify-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Main Admin Console ─── */
  return (
    <div className="min-h-screen bg-[#f4f3ec] p-10 max-md:p-5">
      <div className="mx-auto max-w-[900px] flex flex-col gap-6">
        
        {/* Header Section */}
        <div className="flex items-center justify-between border-b border-border-subtle pb-5 max-sm:flex-col max-sm:items-start max-sm:gap-4">
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7 text-text-primary" />
            <div>
              <h1 className="font-serif text-2xl font-bold text-text-primary">Admin Control Panel</h1>
              <p className="text-xs text-text-secondary">Logged in as {user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="rounded-md border border-border-subtle bg-white px-4 py-2 text-xs font-semibold text-text-primary hover:bg-bg-primary transition-all">
              Dashboard
            </Link>
            <button onClick={logout} className="rounded-md border border-border-subtle bg-[#b3666b]/10 text-[#b3666b] px-4 py-2 text-xs font-semibold hover:bg-[#b3666b]/20 transition-all">
              Sign Out
            </button>
          </div>
        </div>

        {/* Global Action Messages */}
        {statusMessage && (
          <div className={`rounded-lg border px-4 py-3 text-xs ${
            statusMessage.type === "success" 
              ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]" 
              : statusMessage.type === "error"
              ? "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]"
              : "border-border-subtle bg-white text-text-primary"
          }`}>
            {statusMessage.text}
          </div>
        )}

        {/* Database Metrics Stats Grid */}
        <div className="grid grid-cols-4 gap-4 max-md:grid-cols-2">
          {[
            { label: "EXPENSES", val: statsLoading ? "..." : stats?.expenses },
            { label: "SUBSCRIPTIONS", val: statsLoading ? "..." : stats?.subscriptions },
            { label: "LIBRARY ITEMS", val: statsLoading ? "..." : stats?.watchlist },
            { label: "PORTFOLIO", val: statsLoading ? "..." : `₹${stats?.portfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` },
          ].map((card, i) => (
            <div key={i} className="flex flex-col gap-1 rounded-card border border-border-subtle bg-white p-5 shadow-subtle">
              <span className="font-mono text-[9px] font-bold tracking-[0.8px] text-text-secondary uppercase">{card.label}</span>
              <span className="text-[20px] font-bold tracking-tight text-text-primary mt-1">{card.val}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[1.5fr_1fr] gap-6 max-md:grid-cols-1">
          
          {/* Left Column: Cron Alerts Operations */}
          <div className="rounded-card border border-border-subtle bg-white p-6 shadow-subtle flex flex-col gap-4">
            <h3 className="font-serif text-base font-bold text-text-primary flex items-center gap-2 border-b border-border-subtle pb-2">
              <Mail className="h-4.5 w-4.5" /> Trigger Automated Crons
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Manually fire cron events on-demand. This simulates the schedule triggers set up in your GitHub Actions crons.
            </p>

            <div className="flex flex-col gap-3 mt-2">
              {[
                {
                  id: "subscriptions",
                  title: "Trigger Subscription Warnings",
                  desc: "Scans for subscriptions billing in 2-3 days and sends alert emails.",
                  icon: <Bell className="h-4 w-4" />,
                },
                {
                  id: "expenses_weekly",
                  title: "Trigger Weekly Expense Summary",
                  desc: "Summarizes spent categories and daily burn rate for the last 7 days.",
                  icon: <BarChart2 className="h-4 w-4" />,
                },
                {
                  id: "expenses_monthly",
                  title: "Trigger Monthly Expense Summary",
                  desc: "Generates category breakdowns and top outflows for the last 30 days.",
                  icon: <BarChart2 className="h-4 w-4" />,
                },
                {
                  id: "portfolio",
                  title: "Trigger Daily Portfolio Wrap",
                  desc: "Calculates current valuations and emails portfolio Net P&L (5:30 IST close).",
                  icon: <Mail className="h-4 w-4" />,
                },
              ].map((task) => (
                <div key={task.id} className="flex justify-between items-center gap-4 rounded-lg border border-border-subtle bg-bg-primary/30 p-3.5 hover:border-border-hover transition-colors">
                  <div className="min-w-0">
                    <h4 className="text-[12.5px] font-bold text-text-primary flex items-center gap-1.5">
                      {task.icon} {task.title}
                    </h4>
                    <p className="text-[10.5px] text-text-secondary mt-1">{task.desc}</p>
                  </div>
                  <button
                    disabled={cronRunning !== null}
                    onClick={() => triggerCron(task.id)}
                    className="shrink-0 cursor-pointer rounded-md border border-text-primary bg-text-primary text-[11px] font-semibold text-white px-3 py-1.5 transition-all hover:bg-[#2e2d27] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cronRunning === task.id ? "Firing..." : "Run"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Database / Cache Systems */}
          <div className="flex flex-col gap-6">
            
            {/* Cache Controls Card */}
            <div className="rounded-card border border-border-subtle bg-white p-6 shadow-subtle flex flex-col gap-4">
              <h3 className="font-serif text-base font-bold text-text-primary flex items-center gap-2 border-b border-border-subtle pb-2">
                <RefreshCw className="h-4.5 w-4.5" /> Cache Operations
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Clearing the Redis database forces Next.js backend API routes to query Firestore directly on their next request, resetting cache states.
              </p>

              <button
                disabled={flushLoading}
                onClick={flushCache}
                className="mt-2 w-full flex items-center justify-center gap-2 cursor-pointer rounded-md border border-text-primary bg-text-primary text-xs font-semibold text-white py-3 transition-all hover:bg-[#2e2d27] disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> {flushLoading ? "Flushing Cache..." : "Flush Redis Cache"}
              </button>
            </div>

            {/* Quick Server Info Card */}
            <div className="rounded-card border border-border-subtle bg-white p-6 shadow-subtle flex flex-col gap-4">
              <h3 className="font-serif text-base font-bold text-text-primary flex items-center gap-2 border-b border-border-subtle pb-2">
                System Info
              </h3>
              <div className="flex flex-col gap-2 font-mono text-[10px] text-text-secondary">
                <div className="flex justify-between border-b border-f4f3ec pb-1.5">
                  <span>DEPLOYED URL</span>
                  <span className="text-text-primary truncate max-w-[150px]">{process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}</span>
                </div>
                <div className="flex justify-between border-b border-f4f3ec pb-1.5">
                  <span>REDIS CACHE</span>
                  <span className="text-text-primary">ACTIVE</span>
                </div>
                <div className="flex justify-between border-b border-f4f3ec pb-1.5">
                  <span>GOOGLE ANALYTICS</span>
                  <span className="text-text-primary">{process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ? "CONFIGURED" : "MISSING"}</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
