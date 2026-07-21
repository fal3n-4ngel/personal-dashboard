import React from "react";
import { InvestmentAsset, InvestmentCategory, InvestmentQuote } from "@/types";

interface InvestmentsTabProps {
  investments: InvestmentAsset[];
  currency: string;
  invName: string;
  setInvName: (s: string) => void;
  invCategory: InvestmentCategory;
  setInvCategory: (c: InvestmentCategory) => void;
  invQuantity: string;
  setInvQuantity: (s: string) => void;
  invBuyPrice: string;
  setInvBuyPrice: (s: string) => void;
  invAmount: string;
  setInvAmount: (s: string) => void;
  invNotes: string;
  setInvNotes: (s: string) => void;
  isAddingAsset: boolean;
  addInvestment: (e: React.FormEvent) => void;
  deleteInvestment: (id: string) => void;
  isUpdatingPrices: boolean;
  updateMarketPrices: () => void;
  isFetchingInvestments: boolean;
  invSuggestions: InvestmentQuote[];
  setInvSuggestions: (s: InvestmentQuote[]) => void;
  selectSuggestion: (s: InvestmentQuote) => void;
}

export const InvestmentsTab: React.FC<InvestmentsTabProps> = ({
  investments,
  currency,
  invName,
  setInvName,
  invCategory,
  setInvCategory,
  invQuantity,
  setInvQuantity,
  invBuyPrice,
  setInvBuyPrice,
  invAmount,
  setInvAmount,
  invNotes,
  setInvNotes,
  isAddingAsset,
  addInvestment,
  deleteInvestment,
  isUpdatingPrices,
  updateMarketPrices,
  isFetchingInvestments,
  invSuggestions,
  setInvSuggestions,
  selectSuggestion,
}) => {
  const totalValue = investments.reduce((acc, a) => acc + (a.amount || 0), 0);
  const totalInvested = investments.reduce((acc, a) => acc + (a.investedAmount || a.amount || 0), 0);
  const totalProfit = totalValue - totalInvested;
  const profitPct = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  const monthlySip = investments
    .filter((a) => a.category === "sip")
    .reduce((acc, a) => acc + (a.amount || 0), 0);

  // Category breakdown for pie chart
  const catTotals: Record<string, number> = {};
  investments.forEach((a) => {
    catTotals[a.category] = (catTotals[a.category] || 0) + (a.amount || 0);
  });

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px" }}>Portfolio &amp; Investments</h1>
        <button
          onClick={updateMarketPrices}
          disabled={isUpdatingPrices || investments.length === 0}
          className="btn-secondary"
          style={{ fontSize: "12px", padding: "6px 12px", display: "flex", alignItems: "center", gap: "6px" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: isUpdatingPrices ? "spin 1s linear infinite" : "none" }}>
            <path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {isUpdatingPrices ? "Refreshing Prices..." : "Refresh Live Prices"}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="responsive-stats" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
        <div className="stat-card">
          <span className="label-mono">Portfolio Value</span>
          <span className="stat-value">{currency}{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="stat-subtext">Current market value</span>
        </div>
        <div className="stat-card">
          <span className="label-mono">Total Invested</span>
          <span className="stat-value">{currency}{totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="stat-subtext">Principal invested</span>
        </div>
        <div className="stat-card">
          <span className="label-mono">Total Returns</span>
          <span className="stat-value" style={{ color: totalProfit >= 0 ? "#16a34a" : "#b3666b" }}>
            {totalProfit >= 0 ? "+" : ""}{currency}{totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="stat-subtext">{profitPct >= 0 ? "+" : ""}{profitPct.toFixed(2)}% overall gain</span>
        </div>
        <div className="stat-card">
          <span className="label-mono">Monthly SIPs</span>
          <span className="stat-value" style={{ color: "var(--accent-invest)" }}>
            {currency}{monthlySip.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="stat-subtext">Recurring investments</span>
        </div>
      </div>

      {/* Add Investment Form */}
      <div className="bento-card" style={{ position: "relative" }}>
        <span className="label-mono" style={{ marginBottom: "14px", display: "block" }}>Add Asset / SIP / Crypto</span>
        <form onSubmit={addInvestment} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1.2fr auto", gap: "10px", alignItems: "end" }}>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Name or Ticker (e.g. AAPL, BTC, RELIANCE)"
              value={invName}
              onChange={(e) => setInvName(e.target.value)}
              required
            />
            {invSuggestions.length > 0 && (
              <div
                className="bento-card"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 100,
                  marginTop: "4px",
                  padding: "8px",
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
              >
                {invSuggestions.map((s, idx) => (
                  <div
                    key={idx}
                    onClick={() => selectSuggestion(s)}
                    style={{ padding: "6px 8px", cursor: "pointer", fontSize: "12px", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-secondary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <span style={{ fontWeight: 600 }}>{s.symbol || s.name}</span>
                    <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>{s.name} ({s.type})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <select value={invCategory} onChange={(e) => setInvCategory(e.target.value as InvestmentCategory)}>
            <option value="equity">Equity / Stock</option>
            <option value="crypto">Crypto</option>
            <option value="mutual_fund">Mutual Fund</option>
            <option value="sip">SIP</option>
            <option value="gold">Gold</option>
            <option value="cash">Cash / FD</option>
            <option value="other">Other</option>
          </select>

          <input
            type="number"
            placeholder="Quantity Owned"
            value={invQuantity}
            onChange={(e) => setInvQuantity(e.target.value)}
            step="any"
          />

          <input
            type="number"
            placeholder={`Total Invested (${currency})`}
            value={invAmount}
            onChange={(e) => setInvAmount(e.target.value)}
            step="any"
            required
          />

          <input
            type="text"
            placeholder="Notes (optional)"
            value={invNotes}
            onChange={(e) => setInvNotes(e.target.value)}
          />

          <button type="submit" disabled={isAddingAsset} className="btn-primary">
            {isAddingAsset ? "Adding..." : "+ Add Asset"}
          </button>
        </form>
      </div>

      {/* Asset Cards & Allocation Split */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "24px", alignItems: "start" }}>
        {/* Asset Cards Grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {investments.map((asset) => {
            const currentVal = asset.amount || 0;
            const investedVal = asset.investedAmount || asset.amount || 0;
            const assetProfit = currentVal - investedVal;
            const assetProfitPct = investedVal > 0 ? (assetProfit / investedVal) * 100 : 0;

            return (
              <div key={asset.id} className="bento-card" style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <p style={{ fontWeight: 600, fontSize: "15px" }}>{asset.name}</p>
                    <span style={{ fontSize: "9px", fontFamily: "monospace", textTransform: "uppercase", backgroundColor: "var(--bg-secondary)", padding: "2px 6px", borderRadius: "4px", color: "var(--text-muted)" }}>
                      {asset.category}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "12px", marginTop: "4px", fontSize: "12px", color: "var(--text-secondary)" }}>
                    {asset.quantity && <span>Qty: {asset.quantity}</span>}
                    <span>Invested: {currency}{investedVal.toLocaleString()}</span>
                    {asset.notes && <span style={{ color: "var(--text-muted)" }}>({asset.notes})</span>}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontWeight: 700, fontSize: "15px" }}>{currency}{currentVal.toLocaleString()}</p>
                    <p style={{ fontSize: "11px", fontWeight: 600, color: assetProfit >= 0 ? "#16a34a" : "#b3666b" }}>
                      {assetProfit >= 0 ? "+" : ""}{currency}{assetProfit.toFixed(2)} ({assetProfitPct.toFixed(1)}%)
                    </p>
                  </div>
                  <button
                    onClick={() => deleteInvestment(asset.id)}
                    style={{ backgroundColor: "transparent", border: "none", color: "#b3666b", fontSize: "11px", cursor: "pointer" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
          {investments.length === 0 && (
            <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px" }}>
              {isFetchingInvestments ? "Loading portfolio..." : "No investments added yet."}
            </p>
          )}
        </div>

        {/* Allocation Breakdown Card */}
        <div className="bento-card" style={{ padding: "24px" }}>
          <span className="label-mono" style={{ marginBottom: "16px", display: "block" }}>Asset Allocation</span>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {Object.entries(catTotals).map(([cat, total]) => {
              const pct = totalValue > 0 ? Math.round((total / totalValue) * 100) : 0;
              return (
                <div key={cat} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span style={{ fontWeight: 500, textTransform: "capitalize" }}>{cat.replace("_", " ")}</span>
                    <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>{currency}{total.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div style={{ width: "100%", height: "4px", backgroundColor: "var(--bg-secondary)", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", backgroundColor: "var(--accent-invest)" }}></div>
                  </div>
                </div>
              );
            })}
            {Object.keys(catTotals).length === 0 && (
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>No allocation data to plot.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
