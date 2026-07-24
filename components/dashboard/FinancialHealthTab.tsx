import React, { useEffect, useState } from "react";
import { Calendar, CalendarCheck, ScanSearch, IndianRupee, Shield, BarChart3, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
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
  // Recurring commitment (rent + subscriptions) — shown as context, since
  // those payments already land in the expense ledger and are therefore
  // inside projectedTotalSpend rather than added on top of it.
  committedSpend: number;
  // Still expected to be spent between today and the end of the cycle.
  projectedRemaining: number;
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

interface CycleHistoryEntry {
  startStr: string;
  endStr: string;
  income: number;
  spend: number;
  savings: number;
  isSalaryLogged: boolean;
  hasData: boolean;
}

interface CycleAverages {
  avgIncome: number;
  avgSpend: number;
  avgSavings: number;
  avgSavingsRate: number;
  cycleCount: number;
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
  // Past complete cycles' income/spend/savings, newest first — empty until
  // enough logged history exists.
  cycleHistory: CycleHistoryEntry[];
  cycleAverages: CycleAverages | null;
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

// Liquidity/volatility haircut applied to each asset class when sizing the
// emergency reserve. Rationale: layoffs cluster with market downturns, so in
// a real job-loss scenario you may be forced to liquidate volatile holdings
// at a loss — they're worth less than sticker value as an emergency backstop.
const LIQUIDITY_WEIGHTS: Record<string, number> = {
  cash: 1.0,          // immediately spendable
  gold: 0.95,         // quick to sell, holds value in downturns
  mutual_fund: 0.9,   // days to redeem
  sip: 0.9,
  other: 0.85,
  equity: 0.8,        // liquid but volatile — discounted for forced-sale risk
  crypto: 0.65,       // highly volatile
};
const DEFAULT_LIQUIDITY_WEIGHT = 0.85;
// Shown in the methodology box, ordered most→least liquid.
const RESERVE_CLASSES: { key: string; label: string }[] = [
  { key: "cash", label: "Cash / FD" },
  { key: "gold", label: "Gold" },
  { key: "mutual_fund", label: "Mutual funds" },
  { key: "sip", label: "SIP" },
  { key: "equity", label: "Equity" },
  { key: "crypto", label: "Crypto" },
  { key: "other", label: "Other" },
];

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
  cycleHistory,
  cycleAverages,
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

  // Emergency runway — models a TOTAL income loss (job/paycheck stops). This
  // deliberately ignores current income: it answers "if my paycheck stopped
  // tomorrow, how many months would my accessible savings cover spending?"
  // A surplus/deficit "net burn" view is the wrong question — even someone
  // comfortably saving would burn down reserves at their spending rate the
  // moment income disappears.
  const accessibleReserve = safeInvestments.reduce(
    (acc, a) => acc + (a.amount || 0) * (LIQUIDITY_WEIGHTS[a.category] ?? DEFAULT_LIQUIDITY_WEIGHT),
    0
  );
  const reserveHaircutPct = portfolioValue > 0 ? (1 - accessibleReserve / portfolioValue) * 100 : 0;
  // Normalize this cycle's projected spend to a 30-day month so runway reads
  // in familiar monthly terms regardless of cycle length. projectedTotalSpend
  // already folds in subscriptions (which keep charging with or without a
  // job), and it's stable early in the cycle since it leans on the historical
  // baseline — a better "typical monthly burn" than raw spend-so-far.
  const monthlyBurn = payCycle.totalDays > 0 ? payCycle.projectedTotalSpend * (30 / payCycle.totalDays) : 0;
  const emergencyRunwayMonths = monthlyBurn > 0 && accessibleReserve > 0 ? accessibleReserve / monthlyBurn : null;
  // Zone colour keyed to the standard 3–6 month emergency-fund guideline.
  const runwayColor =
    emergencyRunwayMonths === null
      ? "#7c7a72"
      : emergencyRunwayMonths >= 6
      ? "#16a34a"
      : emergencyRunwayMonths >= 3
      ? "#16a34a"
      : emergencyRunwayMonths >= 1
      ? "#d97706"
      : "#b3666b";

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
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.5px]">Financial Health</h1>
          <p className="mt-0.5 text-xs text-text-muted">
            Real pay-cycle pace, savings reconciliation, and long-term runway.
          </p>
        </div>
        <span className={LABEL_MONO}>Cycle {fmtDate(payCycle.startStr)} – {fmtDate(payCycle.endStr)}</span>
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
          <span className={STAT_SUBTEXT}>Committed + projected variable</span>
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
            <Calendar className="h-4 w-4 text-text-secondary" strokeWidth={2.25} /> Current Pay Cycle
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
                  {payCycle.paceDeltaPct > 5 ? (
                    <TrendingUp className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                  ) : payCycle.paceDeltaPct < -5 ? (
                    <TrendingDown className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                  ) : (
                    <Minus className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                  )}
                  <span>
                    On pace to spend <strong>{payCycle.paceDeltaPct >= 0 ? "+" : ""}{payCycle.paceDeltaPct.toFixed(1)}%</strong> vs. last cycle
                    (<strong>{currency}{payCycle.prevCycleSpend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong> then).
                  </span>
                </div>

                {payCycle.paceConfidence < 1 && (
                  <p className="text-[10px] leading-relaxed text-text-muted">
                    {payCycle.paceConfidence === 0
                      ? "Too early to trust today's pace (a single big payment would skew it) — this projection is based entirely on last cycle's trend for now."
                      : `Early in the cycle — this projection still leans on last cycle's trend (${Math.round(payCycle.paceConfidence * 100)}% weight on this cycle's own pace so far), and will shift fully to your live spending by day 9.`}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Projected spend formula — makes the two halves explicit so it's
              clear committed costs (rent/subscriptions) are fully counted,
              and only the variable half is an estimate. */}
          <div className="mt-4 border-t border-border-subtle pt-3">
            <span className="font-mono text-[9px] font-bold tracking-[0.5px] text-text-secondary uppercase">Projected Spend</span>
            <div className="mt-2.5 flex flex-col gap-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Spent so far <span className="text-text-muted">· logged</span></span>
                <span className="font-mono font-semibold text-text-primary">{currency}{payCycle.spentSoFar.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Rest of cycle <span className="text-text-muted">· projected</span></span>
                <span className="font-mono font-semibold text-text-primary">{currency}{payCycle.projectedRemaining.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="mt-0.5 flex items-center justify-between border-t border-border-subtle pt-1.5">
                <span className="font-semibold text-text-primary">Projected cycle spend</span>
                <span className="font-mono font-bold text-text-primary">{currency}{payCycle.projectedTotalSpend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Income − projected = <span className="font-semibold">savings</span></span>
                <span className="font-mono font-bold" style={{ color: payCycle.expectedSavings >= 0 ? "#16a34a" : "#b3666b" }}>
                  {payCycle.expectedSavings >= 0 ? "+" : ""}{currency}{payCycle.expectedSavings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
            {payCycle.committedSpend > 0 && (
              <p className="mt-2.5 text-[10px] leading-relaxed text-text-muted">
                Includes <strong className="text-text-secondary">{currency}{payCycle.committedSpend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/mo</strong> of recurring commitment (rent + subscriptions) — counted through the ledger when each bill is paid, not added on top.
              </p>
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
            <ScanSearch className="h-4 w-4 text-text-secondary" strokeWidth={2.25} /> Does This Match Reality?
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
            <CalendarCheck className="h-4 w-4 text-text-secondary" strokeWidth={2.25} /> This Cycle&apos;s Payday
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
            <IndianRupee className="h-4 w-4 text-text-secondary" strokeWidth={2.25} /> Usual Income
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

      {/* Emergency Runway (income-loss scenario) */}
      {showInvestmentsTab && (
        <div className={BENTO_CARD}>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold tracking-[-0.3px] text-text-primary">
              <Shield className="h-4 w-4 text-text-secondary" strokeWidth={2.25} /> Emergency Runway
            </h2>
            <span className="rounded bg-bg-secondary px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-[0.4px] text-text-muted uppercase">
              If income stops
            </span>
          </div>
          <p className="mb-4 text-[11px] text-text-muted">
            How long your accessible savings would cover spending if your paycheck stopped tomorrow — income is excluded entirely.
          </p>

          {portfolioValue === 0 || monthlyBurn === 0 ? (
            <div className="rounded-lg border border-[#e5e3db] bg-[#f4f3ec] p-3 text-[11px] leading-relaxed text-text-secondary">
              {portfolioValue === 0
                ? "Add holdings in Investments to size your emergency reserve."
                : "Log expenses or subscriptions to estimate your monthly burn."}
            </div>
          ) : (
            <div className="grid grid-cols-[1.5fr_1fr] gap-5 max-md:grid-cols-1">
              {/* Left: headline metric + buffer gauge + status */}
              <div className="flex flex-col">
                <div className="flex items-baseline gap-4">
                  <div>
                    <span className={LABEL_MONO}>Runway</span>
                    <div className="mt-0.5 text-[32px] font-bold leading-none tracking-[-0.5px]" style={{ color: runwayColor }}>
                      {emergencyRunwayMonths !== null ? emergencyRunwayMonths.toFixed(1) : "—"}
                      <span className="ml-1.5 text-[13px] font-semibold text-text-secondary">months</span>
                    </div>
                  </div>
                </div>

                {/* Buffer gauge: 0–12 months, ticks at the 3 & 6-month guideline */}
                <div className="mt-4">
                  <div className="relative">
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-bg-secondary">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, ((emergencyRunwayMonths ?? 0) / 12) * 100)}%`, backgroundColor: runwayColor }}
                      />
                    </div>
                    <div className="pointer-events-none absolute inset-y-0 w-px bg-white/70" style={{ left: "25%" }} />
                    <div className="pointer-events-none absolute inset-y-0 w-px bg-white/70" style={{ left: "50%" }} />
                  </div>
                  <div className="relative mt-1 h-3 text-[9px] text-text-muted">
                    <span className="absolute left-0">0</span>
                    <span className="absolute -translate-x-1/2" style={{ left: "25%" }}>3 mo</span>
                    <span className="absolute -translate-x-1/2" style={{ left: "50%" }}>6 mo</span>
                    <span className="absolute right-0">12+</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border-subtle pt-3">
                  <div>
                    <span className={LABEL_MONO}>Accessible Reserve</span>
                    <div className="mt-1 text-[17px] font-bold text-text-primary">
                      {currency}{accessibleReserve.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </div>
                    <span className="text-[10px] text-text-muted">After −{reserveHaircutPct.toFixed(0)}% liquidity haircut</span>
                  </div>
                  <div>
                    <span className={LABEL_MONO}>Monthly Burn</span>
                    <div className="mt-1 text-[17px] font-bold text-text-primary">
                      {currency}{monthlyBurn.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </div>
                    <span className="text-[10px] text-text-muted">Projected spend, normalized to 30 days</span>
                  </div>
                </div>

                <div className="mt-3.5">
                  {emergencyRunwayMonths !== null && emergencyRunwayMonths >= 6 ? (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-200/50 bg-emerald-50/50 p-2 text-[10px] leading-relaxed text-emerald-800">
                      <span>✓</span>
                      <span><strong>Strong:</strong> Over 6 months of buffer — comfortably above the recommended emergency fund.</span>
                    </div>
                  ) : emergencyRunwayMonths !== null && emergencyRunwayMonths >= 3 ? (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-200/50 bg-emerald-50/50 p-2 text-[10px] leading-relaxed text-emerald-800">
                      <span>✓</span>
                      <span><strong>Adequate:</strong> Within the recommended 3–6 month emergency-fund range.</span>
                    </div>
                  ) : emergencyRunwayMonths !== null && emergencyRunwayMonths >= 1 ? (
                    <div className="flex items-center gap-2 rounded-lg border border-amber-200/50 bg-amber-50/50 p-2 text-[10px] leading-relaxed text-amber-800">
                      <span>⚠</span>
                      <span><strong>Thin:</strong> Below the 3-month guideline. Build up liquid savings when you can.</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-rose-200/50 bg-rose-50/50 p-2 text-[10px] leading-relaxed text-rose-800">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                      <span><strong>Critical:</strong> Under a month of runway. A single income gap would strain your finances.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: methodology explainer */}
              <div className="rounded-lg border border-border-subtle bg-bg-primary/40 p-4">
                <span className="mb-2 block font-mono text-[9px] font-bold tracking-[0.5px] text-text-secondary uppercase">Methodology</span>
                <p className="text-[10.5px] leading-relaxed text-text-secondary">
                  <strong className="text-text-primary">Runway = Accessible Reserve ÷ Monthly Burn.</strong> It assumes income stops entirely, so savings alone must cover spending.
                </p>
                <div className="mt-2.5 flex flex-col gap-1 border-t border-border-subtle pt-2.5 text-[10.5px]">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Portfolio value</span>
                    <span className="font-mono text-text-primary">{currency}{portfolioValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Liquidity haircut</span>
                    <span className="font-mono text-[#b3666b]">−{reserveHaircutPct.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-text-secondary">Accessible reserve</span>
                    <span className="font-mono text-text-primary">{currency}{accessibleReserve.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
                <p className="mt-2.5 text-[10px] leading-relaxed text-text-muted">
                  Volatile assets are discounted — layoffs cluster with downturns, so you may be forced to sell low:
                </p>
                <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[9.5px] text-text-secondary">
                  {RESERVE_CLASSES.map((c) => (
                    <div key={c.key} className="flex justify-between">
                      <span>{c.label}</span>
                      <span className="text-text-primary">{(LIQUIDITY_WEIGHTS[c.key] * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2.5 text-[9.5px] leading-relaxed text-text-muted">
                  Conservative by design — real runway stretches further if you cut discretionary spending during a gap.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cycle History */}
      <div className={BENTO_CARD}>
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold tracking-[-0.3px] text-text-primary">
          <BarChart3 className="h-4 w-4 text-text-secondary" strokeWidth={2.25} /> Cycle History
        </h2>

        {cycleHistory.length === 0 ? (
          <p className="py-4 text-center text-[11px] text-text-muted">
            History will show up here once a past cycle has logged expenses or a saved payday.
          </p>
        ) : (
          <>
            {cycleAverages && (
              <div className="mb-4 grid grid-cols-3 gap-3 border-b border-border-subtle pb-4">
                <div>
                  <span className={LABEL_MONO}>Avg Income</span>
                  <div className="mt-1 text-[15px] font-bold text-text-primary">
                    {currency}{cycleAverages.avgIncome.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div>
                  <span className={LABEL_MONO}>Avg Spend</span>
                  <div className="mt-1 text-[15px] font-bold text-text-primary">
                    {currency}{cycleAverages.avgSpend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div>
                  <span className={LABEL_MONO}>Avg Savings</span>
                  <div className="mt-1 text-[15px] font-bold" style={{ color: cycleAverages.avgSavings >= 0 ? "#16a34a" : "#b3666b" }}>
                    {cycleAverages.avgSavings >= 0 ? "+" : ""}{currency}{cycleAverages.avgSavings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    <span className="ml-1 text-[10px] font-semibold text-text-muted">({cycleAverages.avgSavingsRate.toFixed(1)}%)</span>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    <th className="border-b border-border-subtle px-2 py-1.5 font-mono text-[10px] font-semibold tracking-[0.4px] text-text-muted uppercase">Cycle</th>
                    <th className="border-b border-border-subtle px-2 py-1.5 text-right font-mono text-[10px] font-semibold tracking-[0.4px] text-text-muted uppercase">Income</th>
                    <th className="border-b border-border-subtle px-2 py-1.5 text-right font-mono text-[10px] font-semibold tracking-[0.4px] text-text-muted uppercase">Spend</th>
                    <th className="border-b border-border-subtle px-2 py-1.5 text-right font-mono text-[10px] font-semibold tracking-[0.4px] text-text-muted uppercase">Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {cycleHistory.map((c) => (
                    <tr key={c.startStr}>
                      <td className="border-b border-border-subtle px-2 py-2 text-[12px] whitespace-nowrap text-text-primary">
                        {fmtDate(c.startStr)} – {fmtDate(c.endStr)}
                        {!c.isSalaryLogged && <span className="ml-1.5 text-[9px] text-text-muted">(est.)</span>}
                      </td>
                      <td className="border-b border-border-subtle px-2 py-2 text-right font-mono text-[12px] text-text-primary">
                        {currency}{c.income.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </td>
                      <td className="border-b border-border-subtle px-2 py-2 text-right font-mono text-[12px] text-text-primary">
                        {currency}{c.spend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </td>
                      <td
                        className="border-b border-border-subtle px-2 py-2 text-right font-mono text-[12px] font-semibold"
                        style={{ color: c.savings >= 0 ? "#16a34a" : "#b3666b" }}
                      >
                        {c.savings >= 0 ? "+" : ""}{currency}{c.savings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
