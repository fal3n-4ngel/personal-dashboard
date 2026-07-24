import React, { useEffect, useState } from "react";
import { InvestmentAsset } from "@/types";

interface PayCycle {
  startStr: string;
  endStr: string;
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  spentSoFar: number;
  subMonthlyCost: number;
  projectedTotalSpend: number;
  // 0 (start of cycle) → 1 (a week in): how much the projection trusts this
  // cycle's own live pace vs. blending in last cycle's actual total.
  paceConfidence: number;
  totalIncome: number;
  isSalaryLogged: boolean;
  expectedCashOnHand: number;
  expectedSavings: number;
  savingsRate: number;
  prevCycleSpend: number;
  // What was spent by this same relative day last cycle — the direct
  // "by this day last month" comparison.
  prevCycleSpendToSameDay: number;
  paceDeltaPct: number | null;
  cycleCatBreakdown: Record<string, number>;
}

interface FinancialHealthTabProps {
  currency: string;
  investments: InvestmentAsset[];
  showInvestmentsTab: boolean;
  salaryDay: number;
  monthlySalary: number;
  setMonthlySalary: (val: number) => void;
  additionalIncome: number;
  setAdditionalIncome: (val: number) => void;
  payCycle: PayCycle;
  // The actual amount the user confirmed having, saved against this cycle's
  // start date — undefined if they haven't reconciled this cycle yet.
  savedReconciliation?: number;
  setReconciliation: (cycleStartDate: string, actualAmount: number) => void;
  // Logged paydays keyed by the payday date — lets pay-cycle boundaries
  // snap to an actual variable payday instead of a fixed day-of-month.
  salaryLog: Record<string, { date: string; amount: number }>;
  setSalaryLogEntry: (date: string, amount: number) => void;
}

const STAT_CARD = "flex flex-col gap-1 rounded-card border border-border-subtle bg-bg-card p-5 shadow-subtle";
const LABEL_MONO = "font-mono text-[10px] font-semibold tracking-[0.8px] text-text-secondary uppercase";
const STAT_VALUE = "text-[24px] font-bold tracking-[-0.5px] text-text-primary";
const STAT_SUBTEXT = "mt-1 text-[11px] text-text-muted";
const BENTO_CARD = "rounded-card border border-border-subtle bg-bg-card p-6 shadow-subtle";
const BTN_PRIMARY = "cursor-pointer rounded-md border border-text-primary bg-text-primary px-4 py-2 text-[13px] font-medium text-white transition-all duration-200 hover:border-[#2e2d27] hover:bg-[#2e2d27]";
const BTN_SECONDARY = "cursor-pointer rounded-md border border-border-subtle bg-transparent px-4 py-2 text-[13px] font-medium text-text-primary transition-all duration-200 hover:bg-bg-primary";

const fmtDate = (s: string) => {
  const d = new Date(`${s}T00:00:00`);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export const FinancialHealthTab: React.FC<FinancialHealthTabProps> = ({
  currency,
  investments,
  showInvestmentsTab,
  monthlySalary,
  setMonthlySalary,
  additionalIncome,
  setAdditionalIncome,
  payCycle,
  savedReconciliation,
  setReconciliation,
  salaryLog,
  setSalaryLogEntry,
}) => {
  const [reconcileAnswer, setReconcileAnswer] = useState<"yes" | "no" | null>(null);
  const [actualAmount, setActualAmount] = useState("");
  const [isEditingReconciliation, setIsEditingReconciliation] = useState(false);

  const loggedPayday = salaryLog[payCycle.startStr];
  const [isEditingPayday, setIsEditingPayday] = useState(false);
  const [paydayDate, setPaydayDate] = useState(payCycle.startStr);
  const [paydayAmount, setPaydayAmount] = useState(String(loggedPayday?.amount || monthlySalary || ""));

  // Re-seed the payday form whenever the cycle rolls over.
  useEffect(() => {
    setPaydayDate(payCycle.startStr);
    setPaydayAmount(String(salaryLog[payCycle.startStr]?.amount || monthlySalary || ""));
    setIsEditingPayday(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payCycle.startStr]);

  const savePayday = () => {
    const parsed = parseFloat(paydayAmount);
    if (isNaN(parsed) || !paydayDate) return;
    setSalaryLogEntry(paydayDate, parsed);
    setIsEditingPayday(false);
  };

  // A small gap is just rounding/timing noise, not a real discrepancy —
  // only flag it once it's big enough to plausibly be an unlogged expense.
  const DISCREPANCY_THRESHOLD = Math.max(50, payCycle.totalIncome * 0.01);

  // Re-seed the reconciliation view whenever the saved answer or the cycle
  // itself changes (a new pay cycle always starts unreconciled).
  useEffect(() => {
    if (savedReconciliation !== undefined) {
      setActualAmount(String(savedReconciliation));
      setReconcileAnswer(Math.abs(savedReconciliation - payCycle.expectedCashOnHand) <= DISCREPANCY_THRESHOLD ? "yes" : "no");
    } else {
      setActualAmount("");
      setReconcileAnswer(null);
    }
    setIsEditingReconciliation(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payCycle.startStr, savedReconciliation]);

  const safeInvestments = Array.isArray(investments) ? investments : [];
  const portfolioValue = safeInvestments.reduce((acc, a) => acc + (a.amount || 0), 0);

  // Wealth runway: how long the portfolio would cover expenses if burn
  // outpaces income, using the real pay-cycle projection rather than a
  // rolling average.
  const netBurnRate = Math.max(0, payCycle.projectedTotalSpend - payCycle.totalIncome);
  const runwayMonths =
    netBurnRate > 0 ? portfolioValue / netBurnRate : portfolioValue > 0 && payCycle.projectedTotalSpend > 0 ? Infinity : null;

  const catEntries = Object.entries(payCycle.cycleCatBreakdown);
  const maxCatAmount = catEntries.length > 0 ? catEntries[0][1] : 0;

  const parsedActual = parseFloat(actualAmount);
  const discrepancy = !isNaN(parsedActual) ? payCycle.expectedCashOnHand - parsedActual : null;

  const confirmMatches = () => {
    const rounded = Math.round(payCycle.expectedCashOnHand);
    setReconciliation(payCycle.startStr, rounded);
    setActualAmount(String(rounded));
    setReconcileAnswer("yes");
    setIsEditingReconciliation(false);
  };

  const saveActualAmount = () => {
    if (isNaN(parsedActual)) return;
    setReconciliation(payCycle.startStr, parsedActual);
    setReconcileAnswer("no");
    setIsEditingReconciliation(false);
  };

  const showRecordedSummary = savedReconciliation !== undefined && !isEditingReconciliation;

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.5px]">Financial Health</h1>
        <p className="mt-0.5 text-xs text-text-muted">
          Real pay-cycle pace, savings reconciliation, and long-term runway.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <div className={STAT_CARD}>
          <span className={LABEL_MONO}>TOTAL INCOME</span>
          <span className={STAT_VALUE}>{currency}{payCycle.totalIncome.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
          <span className={STAT_SUBTEXT}>Salary + additional this cycle</span>
        </div>
        <div className={STAT_CARD}>
          <span className={LABEL_MONO}>SPENT SO FAR</span>
          <span className={`${STAT_VALUE} text-accent-blue`}>{currency}{payCycle.spentSoFar.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
          <span className={STAT_SUBTEXT}>Day {payCycle.elapsedDays} of {payCycle.totalDays}</span>
        </div>
        <div className={STAT_CARD}>
          <span className={LABEL_MONO}>PROJECTED CYCLE SPEND</span>
          <span className={STAT_VALUE}>{currency}{payCycle.projectedTotalSpend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
          <span className={STAT_SUBTEXT}>At current pace + subscriptions</span>
        </div>
        <div className={STAT_CARD}>
          <span className={LABEL_MONO}>EXPECTED SAVINGS</span>
          <span className={STAT_VALUE} style={{ color: payCycle.expectedSavings >= 0 ? "#16a34a" : "#b3666b" }}>
            {payCycle.expectedSavings >= 0 ? "+" : ""}{currency}{payCycle.expectedSavings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </span>
          <span className={STAT_SUBTEXT}>{payCycle.savingsRate.toFixed(1)}% of income</span>
        </div>
      </div>

      <div className="grid grid-cols-[1.1fr_1fr] gap-5 max-md:grid-cols-1">
        {/* Pay Cycle Progress */}
        <div className={BENTO_CARD}>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold tracking-[-0.3px] text-text-primary">
            <span>📅</span> Current Pay Cycle
          </h2>
          <p className="text-[11px] text-text-muted">{fmtDate(payCycle.startStr)} – {fmtDate(payCycle.endStr)}</p>

          <div className="mt-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-bg-secondary">
              <div
                className="h-full rounded-full bg-text-primary transition-all duration-500"
                style={{ width: `${Math.min(100, (payCycle.elapsedDays / payCycle.totalDays) * 100)}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-text-muted">
              <span>Day {payCycle.elapsedDays} of {payCycle.totalDays}</span>
              <span>{payCycle.remainingDays} days left</span>
            </div>
          </div>

          <div className="mt-4 border-t border-border-subtle pt-3">
            {payCycle.paceDeltaPct === null ? (
              <p className="text-[11px] text-text-muted">No prior cycle data to compare pace against yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-text-secondary">By this day last cycle</span>
                  <span className="font-semibold text-text-primary">
                    {currency}{payCycle.spentSoFar.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    <span className="mx-1 font-normal text-text-muted">vs</span>
                    {currency}{payCycle.prevCycleSpendToSameDay.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </span>
                </div>

                <div
                  className={`flex items-center gap-2 rounded-lg border p-2.5 text-[11px] leading-relaxed ${
                    payCycle.paceDeltaPct > 5
                      ? "border-rose-200/50 bg-rose-50/50 text-rose-800"
                      : payCycle.paceDeltaPct < -5
                      ? "border-emerald-200/50 bg-emerald-50/50 text-emerald-800"
                      : "border-border-subtle bg-bg-primary text-text-secondary"
                  }`}
                >
                  <span>{payCycle.paceDeltaPct > 5 ? "📈" : payCycle.paceDeltaPct < -5 ? "📉" : "→"}</span>
                  <span>
                    On pace to spend <strong>{payCycle.paceDeltaPct >= 0 ? "+" : ""}{payCycle.paceDeltaPct.toFixed(1)}%</strong> vs. last cycle
                    (<strong>{currency}{payCycle.prevCycleSpend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong> then).
                  </span>
                </div>

                {payCycle.paceConfidence < 1 && (
                  <p className="text-[10px] leading-relaxed text-text-muted">
                    Early in the cycle — this projection still leans on last cycle's trend ({Math.round(payCycle.paceConfidence * 100)}% weight on this
                    cycle's own pace so far), and will shift fully to your live spending by day 7.
                  </p>
                )}
              </div>
            )}
          </div>

          {catEntries.length > 0 && (
            <div className="mt-4 border-t border-border-subtle pt-3">
              <span className="font-mono text-[9px] font-bold tracking-[0.5px] text-text-secondary uppercase">This Cycle's Spending</span>
              <div className="mt-2.5 flex flex-col gap-2">
                {catEntries.slice(0, 5).map(([cat, amt]) => (
                  <div key={cat}>
                    <div className="mb-0.5 flex justify-between text-[11px]">
                      <span className="text-text-secondary">{cat}</span>
                      <span className="font-semibold text-text-primary">{currency}{amt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-secondary">
                      <div className="h-full rounded-full bg-accent-blue" style={{ width: `${maxCatAmount > 0 ? (amt / maxCatAmount) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reconciliation */}
        <div className={BENTO_CARD}>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold tracking-[-0.3px] text-text-primary">
            <span>🔍</span> Does This Match Reality?
          </h2>

          {showRecordedSummary ? (
            <div className="flex flex-col gap-2.5">
              <p className="text-[12px] leading-relaxed text-text-secondary">You confirmed having</p>
              <p className="my-1 text-[26px] font-bold text-text-primary">
                {currency}{(savedReconciliation as number).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
              <p className="mb-1 text-[11px] text-text-muted">
                on this cycle ({fmtDate(payCycle.startStr)} – {fmtDate(payCycle.endStr)}), vs. an expected {currency}
                {payCycle.expectedCashOnHand.toLocaleString("en-IN", { maximumFractionDigits: 0 })}.
              </p>

              {discrepancy !== null && discrepancy > DISCREPANCY_THRESHOLD && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-200/50 bg-rose-50/50 p-2.5 text-[11px] leading-relaxed text-rose-800">
                  <span>⚠</span>
                  <span>
                    <strong>{currency}{discrepancy.toLocaleString("en-IN", { maximumFractionDigits: 0 })} unaccounted for.</strong> You likely
                    have unlogged expenses this cycle — cash spending, a forgotten subscription, or a purchase you haven't logged yet.
                  </span>
                </div>
              )}
              {discrepancy !== null && discrepancy < -DISCREPANCY_THRESHOLD && (
                <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-primary p-2.5 text-[11px] leading-relaxed text-text-secondary">
                  <span>ℹ</span>
                  <span>You have more than expected — check for untracked income, or an expense logged twice.</span>
                </div>
              )}
              {discrepancy !== null && Math.abs(discrepancy) <= DISCREPANCY_THRESHOLD && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200/50 bg-emerald-50/50 p-2.5 text-[11px] text-emerald-800">
                  <span>✓</span>
                  <span>Good — your logged expenses are tracking accurately this cycle.</span>
                </div>
              )}

              <button onClick={() => setIsEditingReconciliation(true)} className="cursor-pointer self-start bg-transparent text-[10px] font-medium text-text-muted underline">
                Update
              </button>
            </div>
          ) : (
            <>
              <p className="text-[12px] leading-relaxed text-text-secondary">
                Based on {currency}{payCycle.totalIncome.toLocaleString("en-IN", { maximumFractionDigits: 0 })} income and{" "}
                {currency}{payCycle.spentSoFar.toLocaleString("en-IN", { maximumFractionDigits: 0 })} logged spending, you should have
              </p>
              <p className="my-2 text-[26px] font-bold text-text-primary">
                {currency}{payCycle.expectedCashOnHand.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
              <p className="mb-3.5 text-[11px] text-text-muted">left right now, across cash and accounts.</p>

              {reconcileAnswer !== "no" && (
                <div className="flex gap-2">
                  <button onClick={confirmMatches} className={`${BTN_PRIMARY} flex-1 text-xs`}>✓ That's right</button>
                  <button onClick={() => setReconcileAnswer("no")} className={`${BTN_SECONDARY} flex-1 text-xs`}>I have less</button>
                </div>
              )}

              {reconcileAnswer === "no" && (
                <div className="flex flex-col gap-2.5">
                  <label className="text-[10px] text-text-muted">What do you actually have left?</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-2.5 flex items-center text-[11px] text-text-muted">{currency}</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={actualAmount}
                      onChange={(e) => setActualAmount(e.target.value)}
                      className="w-full rounded-md border border-border-subtle bg-bg-card py-1.5 pr-2 pl-7 text-xs text-text-primary outline-none transition-all focus:border-border-hover focus:shadow-focus"
                    />
                  </div>

                  {discrepancy !== null && discrepancy > DISCREPANCY_THRESHOLD && (
                    <div className="flex items-center gap-2 rounded-lg border border-rose-200/50 bg-rose-50/50 p-2.5 text-[11px] leading-relaxed text-rose-800">
                      <span>⚠</span>
                      <span>
                        <strong>{currency}{discrepancy.toLocaleString("en-IN", { maximumFractionDigits: 0 })} unaccounted for.</strong> You likely
                        have unlogged expenses this cycle — cash spending, a forgotten subscription, or a purchase you haven't logged yet.
                      </span>
                    </div>
                  )}
                  {discrepancy !== null && discrepancy < -DISCREPANCY_THRESHOLD && (
                    <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-primary p-2.5 text-[11px] leading-relaxed text-text-secondary">
                      <span>ℹ</span>
                      <span>You have more than expected — check for untracked income, or an expense logged twice.</span>
                    </div>
                  )}
                  {discrepancy !== null && Math.abs(discrepancy) <= DISCREPANCY_THRESHOLD && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-200/50 bg-emerald-50/50 p-2.5 text-[11px] text-emerald-800">
                      <span>✓</span>
                      <span>Close enough — that's within normal rounding.</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={saveActualAmount} disabled={isNaN(parsedActual)} className={`${BTN_PRIMARY} flex-1 text-xs disabled:cursor-not-allowed disabled:opacity-50`}>
                      Save
                    </button>
                    <button onClick={() => { setReconcileAnswer(null); setActualAmount(""); }} className="cursor-pointer self-start bg-transparent text-[10px] font-medium text-text-muted underline">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-5 max-md:grid-cols-1">
        {/* This Cycle's Payday — variable paydays (e.g. "last working day
            before the 25th") shift month to month, so salaryDay is only a
            starting estimate; logging the actual date + amount each cycle
            is what makes the pay-cycle math exact. */}
        <div className={BENTO_CARD}>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold tracking-[-0.3px] text-text-primary">
            <span>📅</span> This Cycle&apos;s Payday
          </h2>
          {loggedPayday && !isEditingPayday ? (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200/50 bg-emerald-50/50 p-2.5 text-[11px] text-emerald-800">
                <span>✓</span>
                <span>
                  Logged <strong>{currency}{loggedPayday.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong> on {fmtDate(loggedPayday.date)}
                </span>
              </div>
              <button onClick={() => setIsEditingPayday(true)} className="cursor-pointer self-start bg-transparent text-[10px] font-medium text-text-muted underline">
                Edit
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <p className="text-[11px] leading-relaxed text-text-muted">
                Estimated from your usual payday below — confirm or adjust the exact date and amount for this cycle.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] text-text-muted">Date</label>
                  <input
                    type="date"
                    value={paydayDate}
                    onChange={(e) => setPaydayDate(e.target.value)}
                    className="w-full rounded-md border border-border-subtle bg-bg-card px-2 py-1.5 text-xs text-text-primary outline-none transition-all focus:border-border-hover focus:shadow-focus"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] text-text-muted">Amount</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-2.5 flex items-center text-[11px] text-text-muted">{currency}</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={paydayAmount}
                      onChange={(e) => setPaydayAmount(e.target.value)}
                      className="w-full rounded-md border border-border-subtle bg-bg-card py-1.5 pr-2 pl-7 text-xs text-text-primary outline-none transition-all focus:border-border-hover focus:shadow-focus"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={savePayday} disabled={isNaN(parseFloat(paydayAmount)) || !paydayDate} className={`${BTN_PRIMARY} flex-1 text-xs disabled:cursor-not-allowed disabled:opacity-50`}>
                  Save
                </button>
                {loggedPayday && (
                  <button onClick={() => setIsEditingPayday(false)} className="cursor-pointer self-start bg-transparent text-[10px] font-medium text-text-muted underline">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Income Settings */}
        <div className={BENTO_CARD}>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold tracking-[-0.3px] text-text-primary">
            <span>💰</span> Usual Income
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] text-text-muted">Usual Salary</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-2.5 flex items-center text-[11px] text-text-muted">{currency}</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={monthlySalary || ""}
                  onChange={(e) => setMonthlySalary(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full rounded-md border border-border-subtle bg-bg-card py-1.5 pr-2 pl-7 text-xs text-text-primary outline-none transition-all focus:border-border-hover focus:shadow-focus"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-text-muted">Add. Income</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-2.5 flex items-center text-[11px] text-text-muted">{currency}</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={additionalIncome || ""}
                  onChange={(e) => setAdditionalIncome(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full rounded-md border border-border-subtle bg-bg-card py-1.5 pr-2 pl-7 text-xs text-text-primary outline-none transition-all focus:border-border-hover focus:shadow-focus"
                />
              </div>
            </div>
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-text-muted">
            Fallback default and the pre-filled amount when logging a new payday — {payCycle.isSalaryLogged ? "this cycle uses its logged amount instead." : "this cycle is using it as-is since no payday's been logged yet."}
          </p>
        </div>
      </div>

      {/* Wealth Runway */}
      {showInvestmentsTab && (
        <div className={BENTO_CARD}>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold tracking-[-0.3px] text-text-primary">
            <span>🛡️</span> Wealth Runway
          </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className={LABEL_MONO}>Net Burn Rate</span>
                <div className="mt-1 text-[19px] font-bold text-text-primary">
                  {currency}{netBurnRate.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </div>
                <span className="text-[10px] text-text-muted">Projected spend minus income</span>
              </div>
              <div>
                <span className={LABEL_MONO}>Est. Survival Runway</span>
                <div className="mt-1 text-[19px] font-bold text-text-primary">
                  {runwayMonths === Infinity ? (
                    <span className="text-[16px] font-bold text-emerald-600">∞ <span className="text-[11px] font-semibold">months</span></span>
                  ) : runwayMonths !== null ? (
                    <span>{runwayMonths.toFixed(1)} <span className="text-xs font-semibold text-text-secondary">months</span></span>
                  ) : (
                    <span className="text-xs text-text-muted">N/A</span>
                  )}
                </div>
                <span className="text-[10px] text-text-muted">Portfolio ÷ net burn</span>
              </div>
            </div>

            <div className="mt-3.5 border-t border-border-subtle pt-3">
              {payCycle.projectedTotalSpend === 0 ? (
                <div className="rounded-lg border border-[#e5e3db] bg-[#f4f3ec] p-2 text-[10px] leading-relaxed text-text-secondary">
                  Log expenses or subscriptions to activate your survival runway estimator.
                </div>
              ) : payCycle.totalIncome >= payCycle.projectedTotalSpend ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200/50 bg-emerald-50/50 p-2 text-[10px] leading-relaxed text-emerald-800">
                  <span>✓</span>
                  <span><strong>Surplus Zone:</strong> Income projects to cover this cycle's spend. Saving <strong>{currency}{payCycle.expectedSavings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong>.</span>
                </div>
              ) : runwayMonths === Infinity ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200/50 bg-emerald-50/50 p-2 text-[10px] leading-relaxed text-emerald-800">
                  <span>✓</span>
                  <span>Your income covers all your projected spending this cycle.</span>
                </div>
              ) : runwayMonths !== null && runwayMonths >= 6 ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200/50 bg-emerald-50/50 p-2 text-[10px] leading-relaxed text-emerald-800">
                  <span>✓</span>
                  <span><strong>Safe Zone:</strong> Over 6 months of buffer. Your wealth runway is secure.</span>
                </div>
              ) : runwayMonths !== null && runwayMonths >= 3 ? (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200/50 bg-amber-50/50 p-2 text-[10px] leading-relaxed text-amber-800">
                  <span>⚠</span>
                  <span><strong>Caution:</strong> Between 3 to 6 months. Review non-essential spending.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-rose-200/50 bg-rose-50/50 p-2 text-[10px] leading-relaxed text-rose-800">
                  <span>🚨</span>
                  <span><strong>Warning:</strong> Under 3 months. Urgently reduce burn rate or add cash.</span>
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  );
};
