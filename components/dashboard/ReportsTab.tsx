import React, { useMemo, useState } from "react";
import { Expense, WatchlistItem, MediaStatus, MediaType } from "@/types";
import { downloadCsv } from "@/lib/csv";
import { resolvePayCycle, toLocalDateStr } from "@/lib/dates";

interface SalaryLogEntry {
  date: string;
  amount: number;
}

interface ReportsTabProps {
  expenses: Expense[];
  watchlist: WatchlistItem[];
  currency: string;
  salaryDay: number;
  salaryLog: Record<string, SalaryLogEntry>;
}

const BENTO_CARD = "rounded-card border border-border-subtle bg-bg-card shadow-subtle overflow-hidden";
const CARD_HEADER = "flex items-center justify-between gap-2 border-b border-border-subtle bg-bg-primary/40 px-5 py-3.5";
const CARD_BODY = "flex flex-col gap-2.5 p-5";
const LABEL_MONO = "font-mono text-[10px] font-semibold tracking-[0.8px] text-text-secondary uppercase";
const INPUT_CLASS = "w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-[13px] text-text-primary outline-none transition-all duration-200 focus:border-border-hover focus:shadow-focus";
const BTN_PRIMARY = "cursor-pointer rounded-md border border-text-primary bg-text-primary px-4 py-2 text-[13px] font-medium text-white transition-all duration-200 hover:border-[#2e2d27] hover:bg-[#2e2d27] disabled:cursor-not-allowed disabled:opacity-40";
const PILL = "cursor-pointer rounded-md border border-border-subtle bg-bg-card px-2.5 py-1 text-[10.5px] font-medium text-text-secondary transition-all duration-150 hover:border-border-hover hover:text-text-primary";
const LEDGER_TH = "border-b border-border-subtle px-2.5 py-1.5 text-left font-mono text-[9.5px] font-semibold tracking-[0.4px] text-text-muted uppercase";
const LEDGER_TD = "border-b border-border-subtle px-2.5 py-1.5 text-[11px] text-text-primary";

const todayStamp = () => toLocalDateStr(new Date());

const fmtShort = (s: string) => {
  const d = new Date(`${s}T00:00:00`);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
};

// Builds "This Cycle" / "Last Cycle" / "Last 3" / "Last 6" pay-cycle
// presets by walking resolvePayCycle backward — so quick ranges respect
// actual logged paydays, not just a fixed day-of-month assumption.
function buildCyclePresets(salaryDay: number, salaryLog: Record<string, SalaryLogEntry>) {
  const cycles: { startStr: string; endStr: string }[] = [];
  let refDate = new Date();
  for (let i = 0; i < 6; i++) {
    const c = resolvePayCycle(salaryDay, salaryLog, refDate);
    cycles.push({ startStr: c.startStr, endStr: c.endStr });
    refDate = new Date(`${c.prevEndStr}T00:00:00`);
  }
  return cycles;
}

const ReportCardHeader: React.FC<{ title: string; icon: string; count: number; noun: string }> = ({ title, icon, count, noun }) => (
  <div className={CARD_HEADER}>
    <h2 className="flex items-center gap-2 text-[13px] font-semibold tracking-[-0.2px] text-text-primary">
      <span className="text-[15px]">{icon}</span> {title}
    </h2>
    <span className="rounded bg-bg-secondary px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-[0.4px] text-text-muted uppercase">
      {count} {noun}{count === 1 ? "" : "s"}
    </span>
  </div>
);

const ExpenseReportCard: React.FC<{ expenses: Expense[]; currency: string; salaryDay: number; salaryLog: Record<string, SalaryLogEntry> }> = ({
  expenses,
  currency,
  salaryDay,
  salaryLog,
}) => {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [category, setCategory] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  const cyclePresets = useMemo(() => buildCyclePresets(salaryDay, salaryLog), [salaryDay, salaryLog]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => e.category && set.add(e.category));
    return Array.from(set).sort();
  }, [expenses]);

  const filtered = useMemo(() => {
    return expenses
      .filter((e) => {
        if (dateFrom && (!e.date || e.date < dateFrom)) return false;
        if (dateTo && (!e.date || e.date > dateTo)) return false;
        if (category && e.category !== category) return false;
        const min = parseFloat(minAmount);
        if (!isNaN(min) && (e.amount || 0) < min) return false;
        const max = parseFloat(maxAmount);
        if (!isNaN(max) && (e.amount || 0) > max) return false;
        return true;
      })
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }, [expenses, dateFrom, dateTo, category, minAmount, maxAmount]);

  const total = filtered.reduce((acc, e) => acc + (e.amount || 0), 0);

  const applyPreset = (n: 1 | 2 | 3 | 6) => {
    setDateFrom(cyclePresets[n - 1] ? cyclePresets[n - 1].startStr : "");
    setDateTo(cyclePresets[0].endStr);
  };

  const download = () => {
    downloadCsv(
      `expenses_report_${todayStamp()}.csv`,
      ["Date", "Title", "Category", "Amount", "Notes"],
      filtered.map((e) => [e.date || "", e.title, e.category || "", e.amount ?? "", e.notes || ""])
    );
  };

  return (
    <div className={BENTO_CARD}>
      <ReportCardHeader title="Expenses" icon="💸" count={filtered.length} noun="entry" />
      <div className={CARD_BODY}>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => applyPreset(1)} className={PILL}>This cycle</button>
          <button onClick={() => applyPreset(2)} className={PILL}>Last cycle</button>
          <button onClick={() => applyPreset(3)} className={PILL}>Last 3 cycles</button>
          <button onClick={() => applyPreset(6)} className={PILL}>Last 6 cycles</button>
          <button onClick={() => { setDateFrom(""); setDateTo(""); }} className={PILL}>All time</button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="mb-1 block text-[10px] text-text-muted">From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={`${INPUT_CLASS} text-xs`} />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-text-muted">To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={`${INPUT_CLASS} text-xs`} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-text-muted">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${INPUT_CLASS} cursor-pointer text-xs`}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="mb-1 block text-[10px] text-text-muted">Min {currency}</label>
            <input type="number" min="0" placeholder="0" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className={`${INPUT_CLASS} text-xs`} />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-text-muted">Max {currency}</label>
            <input type="number" min="0" placeholder="Any" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className={`${INPUT_CLASS} text-xs`} />
          </div>
        </div>

        {filtered.length > 0 && (
          <div className="mt-1 overflow-hidden rounded-lg border border-border-subtle">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={LEDGER_TH}>Date</th>
                  <th className={LEDGER_TH}>Title</th>
                  <th className={`${LEDGER_TH} text-right`}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 5).map((e) => (
                  <tr key={e.id}>
                    <td className={`${LEDGER_TD} font-mono whitespace-nowrap`}>{e.date ? fmtShort(e.date) : "—"}</td>
                    <td className={`${LEDGER_TD} max-w-[120px] truncate`}>{e.title}</td>
                    <td className={`${LEDGER_TD} text-right font-mono`}>{currency}{(e.amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 5 && (
              <div className="border-t border-border-subtle bg-bg-primary/40 px-2.5 py-1.5 text-center text-[9.5px] text-text-muted">
                +{filtered.length - 5} more in the full export
              </div>
            )}
          </div>
        )}

        <div className="mt-1 flex items-center justify-between border-t border-border-subtle pt-3">
          <span className="text-[11px] text-text-muted">
            Total: <strong className="text-text-primary">{currency}{total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong>
          </span>
          <button onClick={download} disabled={filtered.length === 0} className={`${BTN_PRIMARY} text-xs`}>
            Download CSV
          </button>
        </div>
      </div>
    </div>
  );
};

const STATUS_OPTIONS: { id: MediaStatus | "all"; label: string }[] = [
  { id: "all", label: "All statuses" },
  { id: "watching", label: "Watching" },
  { id: "paused", label: "Paused" },
  { id: "plan_to_watch", label: "Plan to watch" },
  { id: "completed", label: "Completed" },
  { id: "dropped", label: "Dropped" },
];

const MediaReportCard: React.FC<{ title: string; icon: string; type: MediaType; items: WatchlistItem[] }> = ({ title, icon, type, items }) => {
  const [status, setStatus] = useState<MediaStatus | "all">("all");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [minRating, setMinRating] = useState("");
  const [addedFrom, setAddedFrom] = useState("");
  const [addedTo, setAddedTo] = useState("");

  const typeItems = useMemo(() => items.filter((i) => i.type === type), [items, type]);

  const filtered = useMemo(() => {
    return typeItems
      .filter((i) => {
        if (status !== "all" && i.status !== status) return false;
        const yFrom = parseInt(yearFrom, 10);
        if (!isNaN(yFrom) && (i.year || 0) < yFrom) return false;
        const yTo = parseInt(yearTo, 10);
        if (!isNaN(yTo) && (i.year || 0) > yTo) return false;
        const minR = parseFloat(minRating);
        if (!isNaN(minR) && (i.rating || 0) < minR) return false;
        const entryDate = i.createdAt ? toLocalDateStr(new Date(i.createdAt)) : "";
        if (addedFrom && (!entryDate || entryDate < addedFrom)) return false;
        if (addedTo && (!entryDate || entryDate > addedTo)) return false;
        return true;
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [typeItems, status, yearFrom, yearTo, minRating, addedFrom, addedTo]);

  const download = () => {
    downloadCsv(
      `${type}_report_${todayStamp()}.csv`,
      ["Title", "Year", "Status", "Progress", "TotalEpisodes", "Score", "EntryDate", "LastUpdated"],
      filtered.map((i) => [
        i.title,
        i.year ?? "",
        i.status.replace(/_/g, " "),
        i.progress ?? "",
        i.totalEpisodes ?? "",
        i.rating ?? "",
        i.createdAt ? toLocalDateStr(new Date(i.createdAt)) : "",
        i.updatedAt ? toLocalDateStr(new Date(i.updatedAt)) : "",
      ])
    );
  };

  return (
    <div className={BENTO_CARD}>
      <ReportCardHeader title={title} icon={icon} count={filtered.length} noun="title" />
      <div className={CARD_BODY}>
        <div>
          <label className="mb-1 block text-[10px] text-text-muted">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as MediaStatus | "all")} className={`${INPUT_CLASS} cursor-pointer text-xs`}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="mb-1 block text-[10px] text-text-muted">Year from</label>
            <input type="number" placeholder="e.g. 2000" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} className={`${INPUT_CLASS} text-xs`} />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-text-muted">Year to</label>
            <input type="number" placeholder="e.g. 2026" value={yearTo} onChange={(e) => setYearTo(e.target.value)} className={`${INPUT_CLASS} text-xs`} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-text-muted">Min rating</label>
          <input type="number" min="0" max="10" placeholder="0–10" value={minRating} onChange={(e) => setMinRating(e.target.value)} className={`${INPUT_CLASS} text-xs`} />
        </div>
        <div className="grid grid-cols-2 gap-2.5 border-t border-border-subtle pt-2.5">
          <div>
            <label className="mb-1 block text-[10px] text-text-muted">Added from</label>
            <input type="date" value={addedFrom} onChange={(e) => setAddedFrom(e.target.value)} className={`${INPUT_CLASS} text-xs`} />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-text-muted">Added to</label>
            <input type="date" value={addedTo} onChange={(e) => setAddedTo(e.target.value)} className={`${INPUT_CLASS} text-xs`} />
          </div>
        </div>

        {filtered.length > 0 && (
          <div className="mt-1 overflow-hidden rounded-lg border border-border-subtle">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={LEDGER_TH}>Title</th>
                  <th className={`${LEDGER_TH} text-right`}>Score</th>
                  <th className={`${LEDGER_TH} text-right`}>Status</th>
                  <th className={`${LEDGER_TH} text-right`}>Added</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 5).map((i) => (
                  <tr key={i.id}>
                    <td className={`${LEDGER_TD} max-w-[110px] truncate`}>{i.title}</td>
                    <td className={`${LEDGER_TD} text-right font-mono`}>{i.rating ?? "—"}</td>
                    <td className={`${LEDGER_TD} text-right whitespace-nowrap capitalize`}>{i.status.replace(/_/g, " ")}</td>
                    <td className={`${LEDGER_TD} text-right font-mono whitespace-nowrap`}>{i.createdAt ? fmtShort(toLocalDateStr(new Date(i.createdAt))) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 5 && (
              <div className="border-t border-border-subtle bg-bg-primary/40 px-2.5 py-1.5 text-center text-[9.5px] text-text-muted">
                +{filtered.length - 5} more in the full export
              </div>
            )}
          </div>
        )}

        <div className="mt-1 flex items-center justify-end border-t border-border-subtle pt-3">
          <button onClick={download} disabled={filtered.length === 0} className={`${BTN_PRIMARY} text-xs`}>
            Download CSV
          </button>
        </div>
      </div>
    </div>
  );
};

export const ReportsTab: React.FC<ReportsTabProps> = ({ expenses, watchlist, currency, salaryDay, salaryLog }) => {
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const safeWatchlist = Array.isArray(watchlist) ? watchlist : [];
  const safeSalaryLog = salaryLog || {};

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.5px]">Reports</h1>
          <p className="mt-0.5 text-xs text-text-muted">
            Filtered, exportable records for your expenses and media library.
          </p>
        </div>
        <span className={LABEL_MONO}>Generated {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
        <ExpenseReportCard expenses={safeExpenses} currency={currency} salaryDay={salaryDay} salaryLog={safeSalaryLog} />
        <MediaReportCard title="Movies" icon="🎬" type="movie" items={safeWatchlist} />
        <MediaReportCard title="TV Shows" icon="📺" type="show" items={safeWatchlist} />
        <MediaReportCard title="Anime" icon="🌸" type="anime" items={safeWatchlist} />
        <MediaReportCard title="Books" icon="📚" type="book" items={safeWatchlist} />
      </div>

      <p className={`${LABEL_MONO} normal-case tracking-normal text-text-muted`}>
        Each report applies only the filters set on its own card, independent of filters used elsewhere in the dashboard. Pay-cycle quick ranges reflect logged paydays where available.
      </p>
    </div>
  );
};
