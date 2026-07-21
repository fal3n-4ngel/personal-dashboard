import React from "react";
import { Subscription } from "@/types";
import { getSubLogoUrl } from "@/lib/subscription-logos";

interface SubscriptionsTabProps {
  subscriptions: Subscription[];
  currency: string;
  subName: string;
  setSubName: (s: string) => void;
  subIcon: string;
  setSubIcon: (s: string) => void;
  subCost: string;
  setSubCost: (s: string) => void;
  subCycle: "monthly" | "yearly";
  setSubCycle: (c: "monthly" | "yearly") => void;
  subNextDate: string;
  setSubNextDate: (s: string) => void;
  isAddingSub: boolean;
  addSubscription: (e: React.FormEvent) => void;
  deleteSubscription: (id: string) => void;
  isFetchingSubscriptions: boolean;
}

export const SubscriptionsTab: React.FC<SubscriptionsTabProps> = ({
  subscriptions,
  currency,
  subName,
  setSubName,
  subIcon,
  setSubIcon,
  subCost,
  setSubCost,
  subCycle,
  setSubCycle,
  subNextDate,
  setSubNextDate,
  isAddingSub,
  addSubscription,
  deleteSubscription,
  isFetchingSubscriptions,
}) => {
  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Stat row */}
      <div className="responsive-stats" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
        <div className="stat-card">
          <span className="label-mono">Monthly Burn</span>
          <span className="stat-value" style={{ color: "var(--accent-expense)" }}>
            {currency}{subscriptions.reduce((acc, sub) => acc + (sub.billingCycle === "yearly" ? sub.cost / 12 : sub.cost), 0).toFixed(0)}
          </span>
          <span className="stat-subtext">per month (normalised)</span>
        </div>
        <div className="stat-card">
          <span className="label-mono">Yearly Total</span>
          <span className="stat-value">
            {currency}{subscriptions.reduce((acc, sub) => acc + (sub.billingCycle === "yearly" ? sub.cost : sub.cost * 12), 0).toFixed(0)}
          </span>
          <span className="stat-subtext">annual commitment</span>
        </div>
        <div className="stat-card">
          <span className="label-mono">Active Plans</span>
          <span className="stat-value">{subscriptions.length}</span>
          <span className="stat-subtext">subscriptions tracked</span>
        </div>
        <div className="stat-card">
          <span className="label-mono">Next Due</span>
          <span className="stat-value" style={{ fontSize: "18px", marginTop: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {(() => {
              if (subscriptions.length === 0) return "—";
              const next = subscriptions.slice().sort((a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime())[0];
              return next?.name ?? "—";
            })()}
          </span>
          <span className="stat-subtext">
            {(() => {
              if (subscriptions.length === 0) return "";
              const next = subscriptions.slice().sort((a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime())[0];
              if (!next) return "";
              const d = Math.ceil((new Date(next.nextBillingDate).getTime() - Date.now()) / 86400000);
              return d === 0 ? "due today" : `in ${d} day${d === 1 ? "" : "s"}`;
            })()}
          </span>
        </div>
      </div>

      {/* Add Form */}
      <div className="bento-card">
        <span className="label-mono" style={{ marginBottom: "14px", display: "block" }}>Add Subscription</span>
        <form onSubmit={addSubscription} style={{ display: "grid", gridTemplateColumns: "1fr 70px 1fr 1fr 1fr auto", gap: "9px", alignItems: "end" }}>
          <input type="text" placeholder="Name (e.g. Netflix)" value={subName} onChange={(e) => setSubName(e.target.value)} required />
          <input type="text" placeholder="🍿" value={subIcon} onChange={(e) => setSubIcon(e.target.value)} style={{ textAlign: "center" }} />
          <input type="number" placeholder={`Amount (${currency})`} value={subCost} onChange={(e) => setSubCost(e.target.value)} required step="0.01" />
          <select value={subCycle} onChange={(e) => setSubCycle(e.target.value as "monthly" | "yearly")}>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <input type="date" value={subNextDate} onChange={(e) => setSubNextDate(e.target.value)} required />
          <button type="submit" disabled={isAddingSub} className="btn-primary" style={{ whiteSpace: "nowrap" }}>
            {isAddingSub ? "Adding..." : "+ Add"}
          </button>
        </form>
      </div>

      {/* List + Donut Chart */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "24px", alignItems: "start" }}>
        {/* Subscriptions list */}
        <div className="bento-card" style={{ padding: "24px" }}>
          <span className="label-mono" style={{ marginBottom: "16px", display: "block" }}>
            Active Subscriptions
            <span style={{ marginLeft: "8px", fontSize: "11px", fontWeight: 500, color: "var(--text-muted)", backgroundColor: "var(--bg-secondary)", padding: "2px 7px", borderRadius: "99px" }}>
              {subscriptions.length}
            </span>
          </span>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {subscriptions.length === 0 && isFetchingSubscriptions && (
              <p style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>Loading…</p>
            )}
            {subscriptions.length === 0 && !isFetchingSubscriptions && (
              <p style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>No subscriptions added yet.</p>
            )}
            {subscriptions.map((sub) => {
              const nextDate = new Date(sub.nextBillingDate);
              const daysUntil = Math.ceil((nextDate.getTime() - Date.now()) / 86400000);
              const isDueSoon = daysUntil <= 7 && daysUntil >= 0;
              return (
                <div
                  key={sub.id}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", backgroundColor: "var(--bg-secondary)", borderRadius: "10px", border: "1px solid var(--border-subtle)", transition: "background 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-body)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-secondary)")}
                >
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <div style={{ width: "38px", height: "38px", borderRadius: "9px", backgroundColor: "var(--bg-card)", border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", flexShrink: 0, overflow: "hidden" }}>
                      {(() => {
                        const logoUrl = getSubLogoUrl(sub.name);
                        if (logoUrl) {
                          return (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={logoUrl}
                              alt={sub.name}
                              width={28}
                              height={28}
                              style={{ objectFit: "contain", borderRadius: "3px" }}
                            />
                          );
                        }
                        return sub.icon || "💳";
                      })()}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: "13px" }}>{sub.name}</p>
                      <p style={{ fontSize: "11px", color: isDueSoon ? "#b3666b" : "var(--text-muted)", marginTop: "2px", fontWeight: isDueSoon ? 600 : 400 }}>
                        {isDueSoon ? `⚡ Due in ${daysUntil}d` : `Next: ${sub.nextBillingDate}`}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontWeight: 700, fontSize: "13px" }}>{currency}{sub.cost.toFixed(2)}</p>
                      <p style={{ fontSize: "10px", fontFamily: "monospace", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.4px" }}>{sub.billingCycle}</p>
                    </div>
                    <button
                      onClick={() => deleteSubscription(sub.id)}
                      style={{ backgroundColor: "transparent", border: "none", color: "var(--text-muted)", padding: "4px", borderRadius: "6px", cursor: "pointer", transition: "color 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#b3666b")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Donut Chart */}
        {subscriptions.length > 0 && (() => {
          const COLORS = ["#b3666b", "#e39282", "#6366f1", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#14b8a6"];
          const monthlyAmounts = subscriptions.map((s) => (s.billingCycle === "yearly" ? s.cost / 12 : s.cost));
          const totalMonthly = monthlyAmounts.reduce((a, b) => a + b, 0);
          const r = 72, cx = 100, cy = 100, strokeW = 20;
          const circ = 2 * Math.PI * r;
          let offset = 0;
          const segments = subscriptions.map((sub, i) => {
            const pct = monthlyAmounts[i] / totalMonthly;
            const dash = pct * circ;
            const seg = { sub, color: COLORS[i % COLORS.length], dash, offset, pct, monthly: monthlyAmounts[i] };
            offset += dash;
            return seg;
          });
          return (
            <div className="bento-card" style={{ padding: "24px" }}>
              <span className="label-mono" style={{ marginBottom: "16px", display: "block" }}>Monthly Split</span>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
                <div style={{ position: "relative", width: "190px", height: "190px" }}>
                  <svg viewBox="0 0 200 200" width="190" height="190" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-secondary)" strokeWidth={strokeW} />
                    {segments.map((seg, i) => (
                      <circle
                        key={i}
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={strokeW}
                        strokeDasharray={`${Math.max(seg.dash - 3, 0)} ${circ - Math.max(seg.dash - 3, 0)}`}
                        strokeDashoffset={-seg.offset}
                        style={{ transition: "stroke-dasharray 0.5s ease" }}
                      />
                    ))}
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <p style={{ fontSize: "10px", fontFamily: "monospace", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.5px" }}>Monthly</p>
                    <p style={{ fontSize: "20px", fontWeight: 700, marginTop: "3px", color: "var(--text-primary)" }}>{currency}{totalMonthly.toFixed(0)}</p>
                  </div>
                </div>
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {segments.map((seg, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "2px", backgroundColor: seg.color, flexShrink: 0 }} />
                        <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-primary)" }}>{seg.sub.name}</span>
                      </div>
                      <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--text-muted)", fontWeight: 600 }}>
                        {(seg.pct * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
