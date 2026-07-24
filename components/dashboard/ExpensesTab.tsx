import React from "react";
import { createPortal } from "react-dom";
import { Expense, Subscription } from "@/types";
import { downloadCsv } from "@/lib/csv";

interface ExpensesTabProps {
  currency: string;
  setCurrency: (c: string) => void;
  expenseTab: "ledger" | "subscriptions";
  setExpenseTab: (t: "ledger" | "subscriptions") => void;
  timeFilter: "7" | "30" | "90" | "salary" | "all";
  setTimeFilter: (f: "7" | "30" | "90" | "salary" | "all") => void;
  salaryDay: number;
  setSalaryDay: (d: number) => void;
  totalSpent: number;
  filteredExpenses: Expense[];
  largestCharge: number;
  largestItem: Expense | null;
  topCategory: string;
  activeChart: "category" | "trend";
  setActiveChart: (c: "category" | "trend") => void;
  catBreakdown: Record<string, number>;
  dailyTrend: [string, number][];
  addExpense: (e: React.FormEvent) => void;
  expenseTitle: string;
  setExpenseTitle: (s: string) => void;
  expenseAmount: string;
  setExpenseAmount: (s: string) => void;
  expenseCategory: string;
  setExpenseCategory: (s: string) => void;
  allCategories: string[];
  newCategoryInput: string;
  setNewCategoryInput: (s: string) => void;
  customCategories: string[];
  setCustomCategories: React.Dispatch<React.SetStateAction<string[]>>;
  expenseDate: string;
  setExpenseDate: (s: string) => void;
  expenseNotes: string;
  setExpenseNotes: (s: string) => void;
  isAddingExpense: boolean;
  deleteExpense: (id: string) => void;
  expenseSearch: string;
  setExpenseSearch: (s: string) => void;
  ledgerCategoryFilter: string;
  setLedgerCategoryFilter: (s: string) => void;
  ledgerMinAmount: string;
  setLedgerMinAmount: (s: string) => void;
  ledgerMaxAmount: string;
  setLedgerMaxAmount: (s: string) => void;
  isFetchingExpenses: boolean;
  expensesLoaded: boolean;
  subscriptions: Subscription[];
  expenses: Expense[];
  updateSubscription: (id: string, updates: Partial<Subscription>) => void;
  logSubscriptionExpense: (sub: Subscription) => Promise<void>;
  importExpensesBatch: (items: any[]) => Promise<number>;
}

const STAT_CARD = "flex flex-col gap-1 rounded-card border border-border-subtle bg-bg-card p-5 shadow-subtle";
const LABEL_MONO = "font-mono text-[10px] font-semibold tracking-[0.8px] text-text-secondary uppercase";
const STAT_VALUE = "text-[28px] font-bold tracking-[-0.5px] text-text-primary";
const STAT_SUBTEXT = "mt-1 text-[11px] text-text-muted";
const BENTO_CARD = "rounded-card border border-border-subtle bg-bg-card p-6 shadow-subtle";
const BTN_PRIMARY = "rounded-md border border-text-primary bg-text-primary px-4 py-2 text-[13px] font-medium text-white transition-all duration-200 hover:border-[#2e2d27] hover:bg-[#2e2d27]";
const BTN_SECONDARY = "rounded-md border border-border-subtle bg-transparent text-[13px] font-medium text-text-primary transition-all duration-200 hover:bg-bg-primary disabled:cursor-not-allowed disabled:opacity-50";
const INPUT_CLASS = "rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-[13px] text-text-primary outline-none transition-all duration-200 focus:border-border-hover focus:shadow-focus";
const LEDGER_TH = "border-b border-border-subtle bg-bg-card px-3 py-2.5 font-mono text-[11px] font-semibold tracking-[0.5px] text-text-muted uppercase";
const LEDGER_TD = "border-b border-border-subtle px-3 py-3 align-middle text-[13px] text-text-primary";

const parseCsvLine = (text: string): string[] => {
  const result: string[] = [];
  let cell = "";
  let insideQuote = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (insideQuote && text[i + 1] === '"') {
        cell += '"';
        i++; // Skip second quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === "," && !insideQuote) {
      result.push(cell.trim());
      cell = "";
    } else {
      cell += char;
    }
  }
  result.push(cell.trim());
  return result;
};

const normalizeCsvDate = (dateStr: string): string => {
  const clean = dateStr.trim();
  if (!clean) return "";
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  
  const dmy = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const d = dmy[1].padStart(2, "0");
    const m = dmy[2].padStart(2, "0");
    const y = dmy[3];
    return `${y}-${m}-${d}`;
  }
  
  const ymd = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) {
    const y = ymd[1];
    const m = ymd[2].padStart(2, "0");
    const d = ymd[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  
  try {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      const yStr = d.getFullYear();
      const mStr = String(d.getMonth() + 1).padStart(2, "0");
      const dStr = String(d.getDate()).padStart(2, "0");
      return `${yStr}-${mStr}-${dStr}`;
    }
  } catch {}
  
  return "";
};

const tabPillClass = (active: boolean) =>
  `cursor-pointer rounded-md border-none px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
    active ? "bg-white text-text-primary shadow-[0_1px_3px_rgba(0,0,0,0.06)]" : "bg-transparent text-text-secondary"
  }`;

const chartPillClass = (active: boolean) =>
  `cursor-pointer rounded-md border-none px-3 py-[5px] text-[11px] font-semibold transition-all duration-200 ${
    active ? "bg-white text-text-primary shadow-[0_1px_3px_rgba(0,0,0,0.05)]" : "bg-transparent text-text-secondary"
  }`;

const advanceBillingDate = (dateStr: string, cycle: "monthly" | "yearly"): string => {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  
  const d = new Date(year, month - 1, day);
  if (cycle === "monthly") {
    d.setMonth(d.getMonth() + 1);
  } else {
    d.setFullYear(d.getFullYear() + 1);
  }
  
  const yStr = d.getFullYear();
  const mStr = String(d.getMonth() + 1).padStart(2, "0");
  const dStr = String(d.getDate()).padStart(2, "0");
  return `${yStr}-${mStr}-${dStr}`;
};

const isSubscriptionPaidInLedger = (sub: Subscription, expenses: Expense[]) => {
  if (!sub.nextBillingDate || !expenses) return false;
  const parts = sub.nextBillingDate.split("-").map(Number);
  if (parts.length !== 3) return false;
  const sYear = parts[0];
  const sMonth = parts[1];
  
  return expenses.some((exp) => {
    if (!exp.date) return false;
    const expParts = exp.date.split("-").map(Number);
    if (expParts.length !== 3) return false;
    const eYear = expParts[0];
    const eMonth = expParts[1];
    
    const sameMonth = eYear === sYear && eMonth === sMonth;
    const sameYear = eYear === sYear;
    
    const dateMatch = sub.billingCycle === "monthly" ? sameMonth : sameYear;
    if (!dateMatch) return false;

    const expTitle = exp.title.toLowerCase().trim();
    const subName = sub.name.toLowerCase().trim();
    const nameMatch = expTitle.includes(subName) || subName.includes(expTitle) ||
                      (subName.includes("rent") && expTitle.includes("rent"));
    
    const amtMatch = Math.abs((exp.amount || 0) - sub.cost) < (sub.cost * 0.1) || (exp.amount || 0) === sub.cost;
    
    return nameMatch && amtMatch;
  });
};

export const ExpensesTab: React.FC<ExpensesTabProps> = ({
  currency,
  setCurrency,
  expenseTab,
  setExpenseTab,
  timeFilter,
  setTimeFilter,
  salaryDay,
  setSalaryDay,
  totalSpent,
  filteredExpenses,
  largestCharge,
  largestItem,
  topCategory,
  activeChart,
  setActiveChart,
  catBreakdown,
  dailyTrend,
  addExpense,
  expenseTitle,
  setExpenseTitle,
  expenseAmount,
  setExpenseAmount,
  expenseCategory,
  setExpenseCategory,
  allCategories,
  newCategoryInput,
  setNewCategoryInput,
  customCategories,
  setCustomCategories,
  expenseDate,
  setExpenseDate,
  expenseNotes,
  setExpenseNotes,
  isAddingExpense,
  deleteExpense,
  expenseSearch,
  setExpenseSearch,
  ledgerCategoryFilter,
  setLedgerCategoryFilter,
  ledgerMinAmount,
  setLedgerMinAmount,
  ledgerMaxAmount,
  setLedgerMaxAmount,
  isFetchingExpenses,
  expensesLoaded,
  subscriptions,
  expenses,
  updateSubscription,
  logSubscriptionExpense,
  importExpensesBatch,
}) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 15;

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const [showLogModal, setShowLogModal] = React.useState(false);
  const [pendingSubToPay, setPendingSubToPay] = React.useState<Subscription | null>(null);

  // CSV States
  const [showImportResultModal, setShowImportResultModal] = React.useState(false);
  const [importResultText, setImportResultText] = React.useState("");
  const [isImporting, setIsImporting] = React.useState(false);

  const getLocalDateStr = () => {
    const d = new Date();
    const yStr = d.getFullYear();
    const mStr = String(d.getMonth() + 1).padStart(2, "0");
    const dStr = String(d.getDate()).padStart(2, "0");
    return `${yStr}-${mStr}-${dStr}`;
  };

  const handleExportCsv = () => {
    const headers = ["Description", "Category", "Date", "Amount", "Notes"];
    const rows = filteredExpenses.map((exp) => [
      exp.title,
      exp.category || "",
      exp.date || "",
      exp.amount,
      exp.notes || "",
    ]);
    
    const today = new Date();
    const stamp = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, "0")}${today.getDate().toString().padStart(2, "0")}`;
    downloadCsv(`ledger_export_${stamp}.csv`, headers, rows);
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error("CSV file is empty");
        
        const rawLines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (rawLines.length < 2) throw new Error("CSV file must contain a header row and at least one data row");
        
        const headers = parseCsvLine(rawLines[0]).map(h => h.toLowerCase().trim());
        
        let titleIdx = headers.findIndex(h => h.includes("title") || h.includes("description") || h.includes("desc") || h.includes("name") || h.includes("item"));
        let amountIdx = headers.findIndex(h => h.includes("amount") || h.includes("cost") || h.includes("price") || h.includes("value") || h.includes("amt"));
        let categoryIdx = headers.findIndex(h => h.includes("category") || h.includes("type") || h.includes("cat"));
        let dateIdx = headers.findIndex(h => h.includes("date") || h.includes("time") || h.includes("created"));
        let notesIdx = headers.findIndex(h => h.includes("notes") || h.includes("note") || h.includes("memo"));
        
        // Fallbacks
        if (titleIdx === -1) titleIdx = 0;
        if (amountIdx === -1) amountIdx = headers.length > 1 ? 1 : 0;
        if (categoryIdx === -1) categoryIdx = headers.length > 2 ? 2 : -1;
        if (dateIdx === -1) dateIdx = headers.length > 3 ? 3 : -1;
        if (notesIdx === -1) notesIdx = headers.length > 4 ? 4 : -1;
        
        const entries: any[] = [];
        
        for (let i = 1; i < rawLines.length; i++) {
          const cells = parseCsvLine(rawLines[i]);
          if (cells.length === 0 || (cells.length === 1 && !cells[0])) continue;
          
          const title = cells[titleIdx]?.trim() || "";
          const amtStr = cells[amountIdx]?.replace(/[^\d\.]/g, "") || "0";
          const amount = parseFloat(amtStr);
          
          if (!title || isNaN(amount) || amount <= 0) continue; // Skip invalid entries
          
          const category = categoryIdx !== -1 && cells[categoryIdx] ? cells[categoryIdx].trim() : "Other";
          
          let date = dateIdx !== -1 && cells[dateIdx] ? cells[dateIdx].trim() : "";
          date = normalizeCsvDate(date) || getLocalDateStr();
          
          const notes = notesIdx !== -1 && cells[notesIdx] ? cells[notesIdx].trim() : "";
          
          entries.push({
            title,
            amount,
            category,
            date,
            notes: notes || null
          });
        }
        
        if (entries.length === 0) {
          throw new Error("No valid transactions found in the CSV. Make sure a description and a positive amount are provided.");
        }
        
        const added = await importExpensesBatch(entries);
        setImportResultText(`Successfully imported ${added} transactions into your ledger!`);
        setShowImportResultModal(true);
      } catch (err: any) {
        console.error(err);
        setImportResultText(`Import Failed: ${err.message || "An unexpected error occurred during CSV parsing."}`);
        setShowImportResultModal(true);
      } finally {
        setIsImporting(false);
        e.target.value = "";
      }
    };
    
    reader.readAsText(file);
  };

  const upcomingSubscriptions = React.useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    sevenDaysFromNow.setHours(23, 59, 59, 999);

    const parseDateOnly = (dateStr: string) => {
      const parts = dateStr.split("-");
      if (parts.length !== 3) return new Date();
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    };

    return (subscriptions || []).filter((sub) => {
      if (!sub.nextBillingDate) return false;
      const dueDate = parseDateOnly(sub.nextBillingDate);
      
      // Auto-remove alert if it is already logged in the ledger
      if (isSubscriptionPaidInLedger(sub, expenses)) {
        return false;
      }
      
      return dueDate >= now && dueDate <= sevenDaysFromNow;
    }).sort((a, b) => {
      const aDate = a.nextBillingDate ? parseDateOnly(a.nextBillingDate).getTime() : 0;
      const bDate = b.nextBillingDate ? parseDateOnly(b.nextBillingDate).getTime() : 0;
      return aDate - bDate;
    });
  }, [subscriptions, expenses]);

  // Auto-advance due dates for past/today bills if matched in ledger
  React.useEffect(() => {
    if (!subscriptions || !expenses || !updateSubscription) return;

    const d = new Date();
    const yStr = d.getFullYear();
    const mStr = String(d.getMonth() + 1).padStart(2, "0");
    const dStr = String(d.getDate()).padStart(2, "0");
    const todayStr = `${yStr}-${mStr}-${dStr}`;
    
    subscriptions.forEach((sub) => {
      if (!sub.nextBillingDate) return;
      
      if (sub.nextBillingDate <= todayStr) {
        if (isSubscriptionPaidInLedger(sub, expenses)) {
          const nextDate = advanceBillingDate(sub.nextBillingDate, sub.billingCycle);
          updateSubscription(sub.id, { nextBillingDate: nextDate });
        }
      }
    });
  }, [subscriptions, expenses, updateSubscription]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [expenseSearch, ledgerCategoryFilter, ledgerMinAmount, ledgerMaxAmount]);

  const totalItems = filteredExpenses.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedExpenses = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredExpenses.slice(start, start + pageSize);
  }, [filteredExpenses, currentPage, pageSize]);

  return (
    <>
      {/* Tab controls & currency selector */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex gap-0.5 rounded-lg bg-bg-secondary p-[3px]">
            <button onClick={() => setExpenseTab("ledger")} className={tabPillClass(expenseTab === "ledger")}>
              Ledger
            </button>
            <button onClick={() => setExpenseTab("subscriptions")} className={tabPillClass(expenseTab === "subscriptions")}>
              Subscriptions
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[11px] text-text-muted uppercase">Currency</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={`${INPUT_CLASS} px-2 py-1 text-xs`}
            >
              <option value="₹">INR (₹)</option>
              <option value="$">USD ($)</option>
              <option value="€">EUR (€)</option>
              <option value="£">GBP (£)</option>
              <option value="¥">JPY (¥)</option>
            </select>
          </div>
        </div>

        {expenseTab === "ledger" && (
          <div className="flex items-center gap-3">
            {timeFilter === "salary" && (
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] text-text-muted uppercase">Payday</span>
                <select
                  value={salaryDay}
                  onChange={(e) => setSalaryDay(parseInt(e.target.value, 10))}
                  className={`${INPUT_CLASS} px-2 py-1 text-xs`}
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day}
                      {day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th"} of month
                    </option>
                  ))}
                </select>
              </div>
            )}

            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
              className={`${INPUT_CLASS} px-2 py-1 text-xs`}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="salary">Current Pay Period</option>
              <option value="all">All time</option>
            </select>
          </div>
        )}
      </div>

      {/* LEDGER TAB */}
      {expenseTab === "ledger" && (
        <div className="flex flex-col gap-7 animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]">
          {/* Stat Cards */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 max-md:grid-cols-2 max-md:gap-2.5">
            <div className={STAT_CARD}>
              <span className={LABEL_MONO}>Total Spent</span>
              <span className={STAT_VALUE}>{currency}{totalSpent.toLocaleString()}</span>
              <span className={STAT_SUBTEXT}>{timeFilter === "all" ? "All time" : `Last ${timeFilter} days`}</span>
            </div>
            <div className={STAT_CARD}>
              <span className={LABEL_MONO}>Charges Logged</span>
              <span className={STAT_VALUE} style={{ color: "#b3666b" }}>{filteredExpenses.length}</span>
              <span className={STAT_SUBTEXT}>Transactions</span>
            </div>
            <div className={STAT_CARD}>
              <span className={LABEL_MONO}>Largest Charge</span>
              <span className={`${STAT_VALUE} overflow-hidden text-ellipsis whitespace-nowrap`} style={{ color: "#e39282" }}>{currency}{largestCharge.toLocaleString()}</span>
              <span className={`${STAT_SUBTEXT} overflow-hidden text-ellipsis whitespace-nowrap`}>{largestItem?.title || "—"}</span>
            </div>
            <div className={STAT_CARD}>
              <span className={LABEL_MONO}>Top Category</span>
              <span className={`${STAT_VALUE} mt-2 overflow-hidden text-ellipsis whitespace-nowrap text-[22px]`}>{topCategory}</span>
              <span className={STAT_SUBTEXT}>Highest share</span>
            </div>
          </div>

          {/* Chart */}
          <div className={BENTO_CARD}>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold">Analytics</h3>
              <div className="flex gap-1 rounded-lg bg-bg-secondary p-[3px]">
                <button onClick={() => setActiveChart("category")} className={chartPillClass(activeChart === "category")}>
                  Category Distribution
                </button>
                <button onClick={() => setActiveChart("trend")} className={chartPillClass(activeChart === "trend")}>
                  Daily Trend
                </button>
              </div>
            </div>

            {activeChart === "category" ? (
              <div className="flex h-[260px] items-end justify-start gap-4 overflow-x-auto overflow-y-hidden border-b border-border-subtle pt-2 pb-2">
                {Object.entries(catBreakdown).slice(0, 8).map(([cat, total], idx) => {
                  const maxAmt = Math.max(...Object.values(catBreakdown), 1);
                  const pct = (total / maxAmt) * 100;
                  const colors = ["#b3666b", "#e39282", "#1c1b18", "#6e6c64", "#d1b89a", "#eae8e0", "#9c9a92", "#c4c2ba"];
                  return (
                    <div key={cat} className="flex min-w-[60px] max-w-[90px] flex-1 shrink-0 flex-col items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-text-secondary">{currency}{(total/1000).toFixed(1)}k</span>
                      <div className="flex h-[200px] w-8 items-end rounded-t-md bg-bg-secondary">
                        <div className="w-full rounded-t-md transition-[height] duration-500 ease-in-out" style={{ height: `${pct}%`, backgroundColor: colors[idx % colors.length] }}></div>
                      </div>
                      <span className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-center font-mono text-[9px] text-text-muted uppercase" title={cat}>{cat}</span>
                    </div>
                  );
                })}
                {Object.keys(catBreakdown).length === 0 && <p className="self-center text-[13px] text-text-muted">No transactions to plot.</p>}
              </div>
            ) : (
              <div className="flex h-[260px] items-end justify-start gap-4 overflow-x-auto overflow-y-hidden border-b border-border-subtle pt-2 pb-2">
                {dailyTrend.map(([date, total]) => {
                  const maxAmt = Math.max(...dailyTrend.map(d => d[1]), 1);
                  const pct = (total / maxAmt) * 100;
                  const dateParts = date.split("-");
                  const dateFormatted = dateParts.length === 3 ? `${dateParts[1]}/${dateParts[2]}` : date;
                  return (
                    <div key={date} className="flex min-w-[60px] max-w-[90px] flex-1 shrink-0 flex-col items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-text-secondary">{currency}{total.toLocaleString()}</span>
                      <div className="flex h-[200px] w-8 items-end rounded-t-md bg-bg-secondary">
                        <div className="w-full rounded-t-md bg-[#3b82f6] transition-[height] duration-500 ease-in-out" style={{ height: `${pct}%` }}></div>
                      </div>
                      <span className="w-full text-center font-mono text-[9px] text-text-muted">{dateFormatted}</span>
                    </div>
                  );
                })}
                {dailyTrend.length === 0 && <p className="self-center text-[13px] text-text-muted">No transaction history to plot.</p>}
              </div>
            )}
          </div>

          {/* Upcoming Bills Calendar Widget */}
          {upcomingSubscriptions.length > 0 && (
            <div className={BENTO_CARD}>
              <h3 className="text-sm font-semibold tracking-[-0.3px] text-text-primary mb-3 flex items-center gap-1.5">
                <span>📅</span> Upcoming Bills (Next 7 Days)
              </h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
                {upcomingSubscriptions.map((sub) => {
                  const parts = sub.nextBillingDate ? sub.nextBillingDate.split("-") : [];
                  const dueStr = parts.length === 3 ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : sub.nextBillingDate;
                  return (
                    <div key={sub.id} className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-primary/20 p-3.5 shadow-subtle hover:border-border-hover transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{sub.icon || "💳"}</span>
                        <div>
                          <div className="text-[13px] font-semibold text-text-primary">{sub.name}</div>
                          <div className="text-[11px] text-[#b3666b] font-medium mt-0.5">Due {dueStr}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[14px] font-bold text-text-primary">
                            {currency}{sub.cost.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-text-muted capitalize">{sub.billingCycle}</div>
                        </div>
                        <div className="flex items-center gap-1.5 border-l border-border-subtle/50 pl-3">
                          <button
                            onClick={() => {
                              setPendingSubToPay(sub);
                              setShowLogModal(true);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-md border-none bg-emerald-50 text-emerald-700 cursor-pointer hover:bg-emerald-100 transition-all font-semibold active:scale-95"
                            title="Mark as Paid"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Skip this billing cycle for ${sub.name}?`)) {
                                const nextDate = advanceBillingDate(sub.nextBillingDate, sub.billingCycle);
                                updateSubscription(sub.id, { nextBillingDate: nextDate });
                              }
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-md border-none bg-rose-50 text-rose-700 cursor-pointer hover:bg-rose-100 transition-all font-semibold active:scale-95"
                            title="Decline / Skip Cycle"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Form + Table */}
          <div className="grid grid-cols-[300px_1fr] gap-6 max-md:grid-cols-1">
            <div className="flex flex-col gap-5">
              <div className={BENTO_CARD}>
                <span className={`${LABEL_MONO} mb-3.5 block`}>Log Transaction</span>
                <form onSubmit={addExpense} className="flex flex-col gap-[9px]">
                  <input type="text" value={expenseTitle} onChange={(e) => setExpenseTitle(e.target.value)} placeholder="Description" required className={INPUT_CLASS} />
                  <input type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} placeholder={`Amount (${currency})`} required className={INPUT_CLASS} />

                  <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} required className={`${INPUT_CLASS} w-full cursor-pointer`}>
                    <option value="">Select Category</option>
                    {allCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      placeholder="New category..."
                      className={`${INPUT_CLASS} flex-1 px-2 py-1.5 text-[11px]`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = newCategoryInput.trim();
                        if (trimmed && !customCategories.includes(trimmed)) {
                          setCustomCategories((prev) => [...prev, trimmed]);
                          setExpenseCategory(trimmed);
                          setNewCategoryInput("");
                        }
                      }}
                      className="cursor-pointer rounded-md border border-border-subtle bg-bg-secondary px-3 py-1.5 text-[11px] font-semibold text-text-primary"
                    >
                      + Add
                    </button>
                  </div>

                  <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className={INPUT_CLASS} />
                  <input type="text" value={expenseNotes} onChange={(e) => setExpenseNotes(e.target.value)} placeholder="Notes" className={INPUT_CLASS} />
                  <button type="submit" disabled={isAddingExpense} className={`${BTN_PRIMARY} mt-1`}>{isAddingExpense ? "Logging..." : "Log Item"}</button>
                </form>
              </div>

              {/* Categories breakdown list */}
              <div className={BENTO_CARD}>
                <span className={`${LABEL_MONO} mb-3.5 block`}>Categories</span>
                <div className="flex flex-col gap-2.5">
                  {Object.entries(catBreakdown).map(([cat, total]) => {
                    const pct = totalSpent > 0 ? Math.round((total / totalSpent) * 100) : 0;
                    return (
                      <div key={cat} className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium">{cat}</span>
                          <span className="text-[11px] text-text-muted">{pct}%</span>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-sm bg-bg-secondary">
                          <div className="h-full bg-text-primary" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(catBreakdown).length === 0 && <p className="text-xs text-text-muted">No expenses logged yet.</p>}
                </div>
              </div>
            </div>

            {/* Ledger Table */}
            <div className={`${BENTO_CARD} flex flex-col`}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={LABEL_MONO}>Ledger Sheet</span>
                  <div className="flex gap-1">
                    <button
                      onClick={handleExportCsv}
                      title="Export current filtered ledger list to CSV"
                      className="cursor-pointer rounded-md border border-border-subtle bg-bg-secondary px-2.5 py-1 text-[11px] font-semibold text-text-primary hover:bg-bg-primary hover:border-border-hover transition-all flex items-center gap-1 active:scale-95"
                    >
                      📤 Export
                    </button>
                    <label
                      title="Import expenses from CSV"
                      className="cursor-pointer rounded-md border border-border-subtle bg-bg-secondary px-2.5 py-1 text-[11px] font-semibold text-text-primary hover:bg-bg-primary hover:border-border-hover transition-all flex items-center gap-1 active:scale-95"
                    >
                      {isImporting ? "⏳ Importing..." : "📥 Import"}
                      <input
                        type="file"
                        accept=".csv"
                        disabled={isImporting}
                        onChange={handleImportCsv}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={expenseSearch}
                    onChange={(e) => setExpenseSearch(e.target.value)}
                    className={`${INPUT_CLASS} w-[120px] px-2 py-1 text-[11px]`}
                  />
                  <select
                    value={ledgerCategoryFilter}
                    onChange={(e) => setLedgerCategoryFilter(e.target.value)}
                    className={`${INPUT_CLASS} cursor-pointer px-2 py-1 text-[11px]`}
                  >
                    <option value="">All Categories</option>
                    {allCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder={`Min (${currency})`}
                    value={ledgerMinAmount}
                    onChange={(e) => setLedgerMinAmount(e.target.value)}
                    className={`${INPUT_CLASS} w-[70px] px-2 py-1 text-[11px]`}
                  />
                  <input
                    type="number"
                    placeholder={`Max (${currency})`}
                    value={ledgerMaxAmount}
                    onChange={(e) => setLedgerMaxAmount(e.target.value)}
                    className={`${INPUT_CLASS} w-[70px] px-2 py-1 text-[11px]`}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr>
                      <th className={LEDGER_TH}>Description</th>
                      <th className={LEDGER_TH}>Category</th>
                      <th className={LEDGER_TH}>Date</th>
                      <th className={`${LEDGER_TH} text-right`}>Amount</th>
                      <th className={`${LEDGER_TH} text-right`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-bg-secondary">
                        <td className={`${LEDGER_TD} font-medium`}>
                          {exp.title}
                          {exp.notes && <p className="mt-0.5 text-[10px] text-text-muted">{exp.notes}</p>}
                        </td>
                        <td className={LEDGER_TD}>
                          {exp.category ? (
                            <span className="rounded bg-bg-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase">
                              {exp.category}
                            </span>
                          ) : "—"}
                        </td>
                        <td className={`${LEDGER_TD} text-[11px] text-text-secondary`}>{exp.date || "—"}</td>
                        <td className={`${LEDGER_TD} text-right font-semibold`}>{currency}{(exp.amount || 0).toLocaleString()}</td>
                        <td className={`${LEDGER_TD} text-right`}>
                          <button
                            onClick={() => deleteExpense(exp.id)}
                            className="cursor-pointer border-none bg-transparent px-1.5 py-0.5 text-[11px] text-[#b3666b]"
                          >
                            Archive
                          </button>
                        </td>
                      </tr>
                    ))}
                    {totalItems === 0 && (
                      <tr>
                        <td colSpan={5} className="border-b border-border-subtle p-6 text-center text-text-muted">
                          {isFetchingExpenses ? "Loading expenses..." : "No transactions match your filter."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3.5">
                  <span className="text-xs text-text-muted">
                    Showing {Math.min(totalItems, (currentPage - 1) * pageSize + 1)}-{Math.min(totalItems, currentPage * pageSize)} of {totalItems} transactions
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className={`${BTN_SECONDARY} px-2.5 py-1 text-[11px]`}
                    >
                      Previous
                    </button>
                    <span className="mx-1.5 self-center text-[11px] font-semibold text-text-secondary">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className={`${BTN_SECONDARY} px-2.5 py-1 text-[11px]`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {mounted && showLogModal && pendingSubToPay && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity">
          <div className="w-full max-w-md rounded-xl border border-border-subtle bg-bg-card p-6 shadow-2xl animate-[fadeIn_0.2s_ease-out]">
            <h3 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-2">
              <span>💳</span> Confirm Subscription Payment
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed mb-5">
              You are marking <strong className="text-text-primary">{pendingSubToPay.name}</strong> ({currency}{pendingSubToPay.cost.toFixed(2)}) as paid.
              Would you like to automatically log this as an expense in your ledger?
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={async () => {
                  await logSubscriptionExpense(pendingSubToPay);
                  const nextDate = advanceBillingDate(pendingSubToPay.nextBillingDate, pendingSubToPay.billingCycle);
                  updateSubscription(pendingSubToPay.id, { nextBillingDate: nextDate });
                  setShowLogModal(false);
                  setPendingSubToPay(null);
                }}
                className={`${BTN_PRIMARY} w-full py-2.5 text-xs font-semibold`}
              >
                Yes, Log Expense & Mark Paid
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextDate = advanceBillingDate(pendingSubToPay.nextBillingDate, pendingSubToPay.billingCycle);
                  updateSubscription(pendingSubToPay.id, { nextBillingDate: nextDate });
                  setShowLogModal(false);
                  setPendingSubToPay(null);
                }}
                className={`${BTN_SECONDARY} w-full py-2.5 text-xs font-semibold`}
              >
                No, Just Advance Cycle
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogModal(false);
                  setPendingSubToPay(null);
                }}
                className="w-full py-2.5 text-xs text-text-muted hover:text-text-primary bg-transparent border-none cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {mounted && showImportResultModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity">
          <div className="w-full max-w-sm rounded-xl border border-border-subtle bg-bg-card p-6 shadow-2xl animate-[fadeIn_0.2s_ease-out]">
            <h3 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-2">
              <span>📥</span> Import CSV Results
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed mb-5">
              {importResultText}
            </p>
            <button
              type="button"
              onClick={() => {
                setShowImportResultModal(false);
                setImportResultText("");
              }}
              className={`${BTN_PRIMARY} w-full py-2.5 text-xs font-semibold`}
            >
              OK
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
