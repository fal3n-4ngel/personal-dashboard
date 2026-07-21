import React from "react";
import { Expense } from "@/types";

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
}

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
}) => {
  return (
    <>
      {/* Tab controls & currency selector */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", gap: "2px", backgroundColor: "var(--bg-secondary)", borderRadius: "8px", padding: "3px" }}>
            <button
              onClick={() => setExpenseTab("ledger")}
              style={{
                fontSize: "12px",
                fontWeight: 600,
                padding: "6px 14px",
                backgroundColor: expenseTab === "ledger" ? "#fff" : "transparent",
                color: expenseTab === "ledger" ? "var(--text-primary)" : "var(--text-secondary)",
                borderRadius: "6px",
                boxShadow: expenseTab === "ledger" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.2s",
                border: "none",
                cursor: "pointer",
              }}
            >
              Ledger
            </button>
            <button
              onClick={() => setExpenseTab("subscriptions")}
              style={{
                fontSize: "12px",
                fontWeight: 600,
                padding: "6px 14px",
                backgroundColor: expenseTab === "subscriptions" ? "#fff" : "transparent",
                color: expenseTab === "subscriptions" ? "var(--text-primary)" : "var(--text-secondary)",
                borderRadius: "6px",
                boxShadow: expenseTab === "subscriptions" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.2s",
                border: "none",
                cursor: "pointer",
              }}
            >
              Subscriptions
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "11px", fontFamily: "monospace", textTransform: "uppercase", color: "var(--text-muted)" }}>Currency</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{ padding: "4px 8px", fontSize: "12px", borderRadius: "6px" }}
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
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {expenseTab === "ledger" && timeFilter === "salary" && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11px", fontFamily: "monospace", textTransform: "uppercase", color: "var(--text-muted)" }}>Payday</span>
                <select
                  value={salaryDay}
                  onChange={(e) => setSalaryDay(parseInt(e.target.value, 10))}
                  style={{ padding: "4px 8px", fontSize: "12px", borderRadius: "6px" }}
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

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as any)}
                style={{ padding: "4px 8px", fontSize: "12px", borderRadius: "6px" }}
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="salary">Current Pay Period</option>
                <option value="all">All time</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* LEDGER TAB */}
      {expenseTab === "ledger" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }} className="animate-fade-in">
          {/* Stat Cards */}
          <div className="responsive-stats" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <div className="stat-card">
              <span className="label-mono">Total Spent</span>
              <span className="stat-value">{currency}{totalSpent.toLocaleString()}</span>
              <span className="stat-subtext">{timeFilter === "all" ? "All time" : `Last ${timeFilter} days`}</span>
            </div>
            <div className="stat-card">
              <span className="label-mono">Charges Logged</span>
              <span className="stat-value" style={{ color: "#b3666b" }}>{filteredExpenses.length}</span>
              <span className="stat-subtext">Transactions</span>
            </div>
            <div className="stat-card">
              <span className="label-mono">Largest Charge</span>
              <span className="stat-value" style={{ color: "#e39282", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currency}{largestCharge.toLocaleString()}</span>
              <span className="stat-subtext" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{largestItem?.title || "—"}</span>
            </div>
            <div className="stat-card">
              <span className="label-mono">Top Category</span>
              <span className="stat-value" style={{ fontSize: "22px", marginTop: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{topCategory}</span>
              <span className="stat-subtext">Highest share</span>
            </div>
          </div>

          {/* Chart */}
          <div className="bento-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 600 }}>Analytics</h3>
              <div style={{ display: "flex", gap: "4px", backgroundColor: "var(--bg-secondary)", borderRadius: "8px", padding: "3px" }}>
                <button
                  onClick={() => setActiveChart("category")}
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "5px 12px",
                    backgroundColor: activeChart === "category" ? "#fff" : "transparent",
                    color: activeChart === "category" ? "var(--text-primary)" : "var(--text-secondary)",
                    borderRadius: "6px",
                    boxShadow: activeChart === "category" ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                    transition: "all 0.2s",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Category Distribution
                </button>
                <button
                  onClick={() => setActiveChart("trend")}
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "5px 12px",
                    backgroundColor: activeChart === "trend" ? "#fff" : "transparent",
                    color: activeChart === "trend" ? "var(--text-primary)" : "var(--text-secondary)",
                    borderRadius: "6px",
                    boxShadow: activeChart === "trend" ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                    transition: "all 0.2s",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Daily Trend
                </button>
              </div>
            </div>

            {activeChart === "category" ? (
              <div className="chart-container" style={{ display: "flex", justifyContent: "flex-start", alignItems: "flex-end", height: "260px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "8px", overflowX: "auto", overflowY: "hidden", gap: "16px", paddingTop: "8px" }}>
                {Object.entries(catBreakdown).slice(0, 8).map(([cat, total], idx) => {
                  const maxAmt = Math.max(...Object.values(catBreakdown), 1);
                  const pct = (total / maxAmt) * 100;
                  const colors = ["#b3666b", "#e39282", "#1c1b18", "#6e6c64", "#d1b89a", "#eae8e0", "#9c9a92", "#c4c2ba"];
                  return (
                    <div key={cat} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", minWidth: "60px", maxWidth: "90px", flexShrink: 0, flex: 1 }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)" }}>{currency}{(total/1000).toFixed(1)}k</span>
                      <div className="chart-bar-container" style={{ width: "32px", height: "200px", display: "flex", alignItems: "flex-end", backgroundColor: "var(--bg-secondary)", borderRadius: "6px 6px 0 0" }}>
                        <div style={{ width: "100%", height: `${pct}%`, backgroundColor: colors[idx % colors.length], borderRadius: "6px 6px 0 0", transition: "height 0.5s ease" }}></div>
                      </div>
                      <span style={{ fontSize: "9px", fontFamily: "monospace", textTransform: "uppercase", color: "var(--text-muted)", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }} title={cat}>{cat}</span>
                    </div>
                  );
                })}
                {Object.keys(catBreakdown).length === 0 && <p style={{ color: "var(--text-muted)", fontSize: "13px", alignSelf: "center" }}>No transactions to plot.</p>}
              </div>
            ) : (
              <div className="chart-container" style={{ display: "flex", justifyContent: "flex-start", alignItems: "flex-end", height: "260px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "8px", overflowX: "auto", overflowY: "hidden", gap: "16px", paddingTop: "8px" }}>
                {dailyTrend.map(([date, total]) => {
                  const maxAmt = Math.max(...dailyTrend.map(d => d[1]), 1);
                  const pct = (total / maxAmt) * 100;
                  const dateParts = date.split("-");
                  const dateFormatted = dateParts.length === 3 ? `${dateParts[1]}/${dateParts[2]}` : date;
                  return (
                    <div key={date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", minWidth: "60px", maxWidth: "90px", flexShrink: 0, flex: 1 }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)" }}>{currency}{total.toLocaleString()}</span>
                      <div className="chart-bar-container" style={{ width: "32px", height: "200px", display: "flex", alignItems: "flex-end", backgroundColor: "var(--bg-secondary)", borderRadius: "6px 6px 0 0" }}>
                        <div style={{ width: "100%", height: `${pct}%`, backgroundColor: "#3b82f6", borderRadius: "6px 6px 0 0", transition: "height 0.5s ease" }}></div>
                      </div>
                      <span style={{ fontSize: "9px", fontFamily: "monospace", color: "var(--text-muted)", textAlign: "center", width: "100%" }}>{dateFormatted}</span>
                    </div>
                  );
                })}
                {dailyTrend.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: "13px", alignSelf: "center" }}>No transaction history to plot.</p>}
              </div>
            )}
          </div>

          {/* Form + Table */}
          <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="bento-card">
                <span className="label-mono" style={{ marginBottom: "14px", display: "block" }}>Log Transaction</span>
                <form onSubmit={addExpense} style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                  <input type="text" value={expenseTitle} onChange={(e) => setExpenseTitle(e.target.value)} placeholder="Description" required />
                  <input type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} placeholder={`Amount (${currency})`} required />

                  <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} required style={{ width: "100%" }}>
                    <option value="">Select Category</option>
                    {allCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  <div style={{ display: "flex", gap: "6px" }}>
                    <input
                      type="text"
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      placeholder="New category..."
                      style={{ flex: 1, fontSize: "11px", padding: "6px 8px" }}
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
                      style={{
                        padding: "6px 12px",
                        fontSize: "11px",
                        backgroundColor: "var(--bg-secondary)",
                        color: "var(--text-primary)",
                        fontWeight: 600,
                        borderRadius: "6px",
                        border: "1px solid var(--border-subtle)",
                        cursor: "pointer",
                      }}
                    >
                      + Add
                    </button>
                  </div>

                  <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
                  <input type="text" value={expenseNotes} onChange={(e) => setExpenseNotes(e.target.value)} placeholder="Notes" />
                  <button type="submit" disabled={isAddingExpense} className="btn-primary" style={{ marginTop: "4px" }}>{isAddingExpense ? "Logging..." : "Log Item"}</button>
                </form>
              </div>

              {/* Categories breakdown list */}
              <div className="bento-card">
                <span className="label-mono" style={{ marginBottom: "14px", display: "block" }}>Categories</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {Object.entries(catBreakdown).map(([cat, total]) => {
                    const pct = totalSpent > 0 ? Math.round((total / totalSpent) * 100) : 0;
                    return (
                      <div key={cat} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                          <span style={{ fontWeight: 500 }}>{cat}</span>
                          <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>{pct}%</span>
                        </div>
                        <div style={{ width: "100%", height: "4px", backgroundColor: "var(--bg-secondary)", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", backgroundColor: "var(--text-primary)" }}></div>
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(catBreakdown).length === 0 && <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>No expenses logged yet.</p>}
                </div>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="bento-card" style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                <span className="label-mono">Ledger Sheet</span>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={expenseSearch}
                    onChange={(e) => setExpenseSearch(e.target.value)}
                    style={{ fontSize: "11px", padding: "4px 8px", width: "120px" }}
                  />
                  <select
                    value={ledgerCategoryFilter}
                    onChange={(e) => setLedgerCategoryFilter(e.target.value)}
                    style={{ fontSize: "11px", padding: "4px 8px" }}
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
                    style={{ fontSize: "11px", padding: "4px 8px", width: "70px" }}
                  />
                  <input
                    type="number"
                    placeholder={`Max (${currency})`}
                    value={ledgerMaxAmount}
                    onChange={(e) => setLedgerMaxAmount(e.target.value)}
                    style={{ fontSize: "11px", padding: "4px 8px", width: "70px" }}
                  />
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Date</th>
                      <th style={{ textAlign: "right" }}>Amount</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((exp) => (
                      <tr key={exp.id}>
                        <td style={{ fontWeight: 500 }}>
                          {exp.title}
                          {exp.notes && <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{exp.notes}</p>}
                        </td>
                        <td>
                          {exp.category ? (
                            <span style={{ fontSize: "10px", fontFamily: "monospace", textTransform: "uppercase", backgroundColor: "var(--bg-secondary)", padding: "2px 6px", borderRadius: "4px" }}>
                              {exp.category}
                            </span>
                          ) : "—"}
                        </td>
                        <td style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{exp.date || "—"}</td>
                        <td style={{ textAlign: "right", fontWeight: 600 }}>{currency}{(exp.amount || 0).toLocaleString()}</td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            onClick={() => deleteExpense(exp.id)}
                            style={{ backgroundColor: "transparent", border: "none", color: "#b3666b", fontSize: "11px", padding: "2px 6px", cursor: "pointer" }}
                          >
                            Archive
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredExpenses.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px" }}>
                          {isFetchingExpenses ? "Loading expenses..." : "No transactions match your filter."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
