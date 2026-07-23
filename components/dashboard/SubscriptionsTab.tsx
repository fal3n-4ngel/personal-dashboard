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

const STAT_CARD = "flex flex-col gap-1 rounded-card border border-border-subtle bg-bg-card p-5 shadow-subtle";
const LABEL_MONO = "font-mono text-[10px] font-semibold tracking-[0.8px] text-text-secondary uppercase";
const STAT_VALUE = "text-[28px] font-bold tracking-[-0.5px] text-text-primary";
const STAT_SUBTEXT = "mt-1 text-[11px] text-text-muted";
const BENTO_CARD = "rounded-card border border-border-subtle bg-bg-card p-6 shadow-subtle";
const BTN_PRIMARY = "rounded-md border border-text-primary bg-text-primary px-4 py-2 text-[13px] font-medium text-white transition-all duration-200 hover:border-[#2e2d27] hover:bg-[#2e2d27]";
const INPUT_CLASS = "rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-[13px] text-text-primary outline-none transition-all duration-200 focus:border-border-hover focus:shadow-focus";

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
  const [now] = React.useState(() => Date.now());

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]">
      {/* Stat row */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 max-md:grid-cols-2 max-md:gap-2.5">
        <div className={STAT_CARD}>
          <span className={LABEL_MONO}>Monthly Burn</span>
          <span className={STAT_VALUE}>
            {currency}{subscriptions.reduce((acc, sub) => acc + (sub.billingCycle === "yearly" ? sub.cost / 12 : sub.cost), 0).toFixed(0)}
          </span>
          <span className={STAT_SUBTEXT}>per month (normalised)</span>
        </div>
        <div className={STAT_CARD}>
          <span className={LABEL_MONO}>Yearly Total</span>
          <span className={STAT_VALUE}>
            {currency}{subscriptions.reduce((acc, sub) => acc + (sub.billingCycle === "yearly" ? sub.cost : sub.cost * 12), 0).toFixed(0)}
          </span>
          <span className={STAT_SUBTEXT}>annual commitment</span>
        </div>
        <div className={STAT_CARD}>
          <span className={LABEL_MONO}>Active Plans</span>
          <span className={STAT_VALUE}>{subscriptions.length}</span>
          <span className={STAT_SUBTEXT}>subscriptions tracked</span>
        </div>
        <div className={STAT_CARD}>
          <span className={LABEL_MONO}>Next Due</span>
          <span className={`${STAT_VALUE} mt-2 overflow-hidden text-ellipsis whitespace-nowrap text-lg`}>
            {(() => {
              if (subscriptions.length === 0) return "—";
              const next = subscriptions.slice().sort((a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime())[0];
              return next?.name ?? "—";
            })()}
          </span>
          <span className={STAT_SUBTEXT}>
            {(() => {
              if (subscriptions.length === 0) return "";
              const next = subscriptions.slice().sort((a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime())[0];
              if (!next) return "";
              const d = Math.ceil((new Date(next.nextBillingDate).getTime() - now) / 86400000);
              return d === 0 ? "due today" : `in ${d} day${d === 1 ? "" : "s"}`;
            })()}
          </span>
        </div>
      </div>

      {/* Add Form */}
      <div className={BENTO_CARD}>
        <span className={`${LABEL_MONO} mb-3.5 block`}>Add Subscription</span>
        <form onSubmit={addSubscription} className="grid grid-cols-2 gap-[9px] md:grid-cols-[1fr_70px_1fr_1fr_1fr_auto] items-end">
          <div className="col-span-2 md:col-span-1 flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold text-text-secondary uppercase md:hidden">Name</span>
            <input type="text" placeholder="Name (e.g. Netflix)" value={subName} onChange={(e) => setSubName(e.target.value)} required className={`${INPUT_CLASS} w-full`} />
          </div>
          <div className="col-span-1 md:col-span-1 flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold text-text-secondary uppercase md:hidden">Icon</span>
            <input type="text" placeholder="🍿" value={subIcon} onChange={(e) => setSubIcon(e.target.value)} className={`${INPUT_CLASS} text-center w-full`} />
          </div>
          <div className="col-span-1 md:col-span-1 flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold text-text-secondary uppercase md:hidden">Amount</span>
            <input type="number" placeholder={`Amount (${currency})`} value={subCost} onChange={(e) => setSubCost(e.target.value)} required step="0.01" className={`${INPUT_CLASS} w-full`} />
          </div>
          <div className="col-span-1 md:col-span-1 flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold text-text-secondary uppercase md:hidden">Cycle</span>
            <select value={subCycle} onChange={(e) => setSubCycle(e.target.value as "monthly" | "yearly")} className={`${INPUT_CLASS} cursor-pointer w-full`}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="col-span-1 md:col-span-1 flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold text-text-secondary uppercase md:hidden">Next Due</span>
            <input type="date" value={subNextDate} onChange={(e) => setSubNextDate(e.target.value)} required className={`${INPUT_CLASS} w-full`} />
          </div>
          <button type="submit" disabled={isAddingSub} className={`${BTN_PRIMARY} col-span-2 md:col-span-1 whitespace-nowrap w-full`}>
            {isAddingSub ? "Adding..." : "+ Add"}
          </button>
        </form>
      </div>

      {/* List + Donut Chart */}
      <div className="grid grid-cols-[1fr_300px] items-start gap-6 max-md:grid-cols-1">
        {/* Subscriptions list */}
        <div className={BENTO_CARD}>
          <span className={`${LABEL_MONO} mb-4 block`}>
            Active Subscriptions
            <span className="ml-2 rounded-full bg-bg-secondary px-[7px] py-0.5 text-[11px] font-medium text-text-muted">
              {subscriptions.length}
            </span>
          </span>

          <div className="flex flex-col gap-2">
            {subscriptions.length === 0 && isFetchingSubscriptions && (
              <p className="p-5 text-center text-[13px] text-text-muted">Loading…</p>
            )}
            {subscriptions.length === 0 && !isFetchingSubscriptions && (
              <p className="p-5 text-center text-[13px] text-text-muted">No subscriptions added yet.</p>
            )}
            {subscriptions.map((sub) => {
              const nextDate = new Date(sub.nextBillingDate);
              const daysUntil = Math.ceil((nextDate.getTime() - now) / 86400000);
              const isDueSoon = daysUntil <= 7 && daysUntil >= 0;
              return (
                <div
                  key={sub.id}
                  className="flex items-center justify-between rounded-[10px] border border-border-subtle bg-bg-secondary px-3.5 py-3 transition-colors duration-150 hover:bg-bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-[9px] border border-border-subtle bg-bg-card text-[17px]">
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
                              className="rounded-[3px] object-contain"
                            />
                          );
                        }
                        return sub.icon || "💳";
                      })()}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold">{sub.name}</p>
                      <p className={`mt-0.5 text-[11px] ${isDueSoon ? "font-semibold text-[#b3666b]" : "font-normal text-text-muted"}`}>
                        {isDueSoon ? `⚡ Due in ${daysUntil}d` : `Next: ${sub.nextBillingDate}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3.5">
                    <div className="text-right">
                      <p className="text-[13px] font-bold">{currency}{sub.cost.toFixed(2)}</p>
                      <p className="font-mono text-[10px] tracking-[0.4px] text-text-muted uppercase">{sub.billingCycle}</p>
                    </div>
                    <button
                      onClick={() => deleteSubscription(sub.id)}
                      className="rounded-md border-none bg-transparent p-1 text-text-muted transition-colors duration-150 hover:text-[#b3666b]"
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
            <div className={`${BENTO_CARD} max-md:col-start-1`}>
              <span className={`${LABEL_MONO} mb-4 block`}>Monthly Split</span>
              <div className="flex flex-col items-center gap-5">
                <div className="relative h-[190px] w-[190px]">
                  <svg viewBox="0 0 200 200" width="190" height="190" className="-rotate-90">
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
                        className="transition-[stroke-dasharray] duration-500 ease-in-out"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="font-mono text-[10px] tracking-[0.5px] text-text-muted uppercase">Monthly</p>
                    <p className="mt-[3px] text-xl font-bold text-text-primary">{currency}{totalMonthly.toFixed(0)}</p>
                  </div>
                </div>
                <div className="flex w-full flex-col gap-2">
                  {segments.map((seg, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: seg.color }} />
                        <span className="text-xs font-medium text-text-primary">{seg.sub.name}</span>
                      </div>
                      <span className="font-mono text-[11px] font-semibold text-text-muted">
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
