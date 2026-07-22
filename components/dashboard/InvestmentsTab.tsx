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
  const safeInvestments = Array.isArray(investments) ? investments : [];
  const totalValue = safeInvestments.reduce((acc, a) => acc + (a.amount || 0), 0);
  const totalInvested = safeInvestments.reduce((acc, a) => acc + (a.investedAmount || a.amount || 0), 0);
  const totalProfit = totalValue - totalInvested;
  const profitPct = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
  const holdingsCount = safeInvestments.length;

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header matching Screenshot 4 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px" }}>Investment Portfolios</h1>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
            Track assets manually or simulate live market updates.
          </p>
        </div>
        <button
          onClick={updateMarketPrices}
          disabled={isUpdatingPrices || safeInvestments.length === 0}
          className="btn-primary"
          style={{ fontSize: "12px", padding: "8px 16px", display: "flex", alignItems: "center", gap: "6px" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: isUpdatingPrices ? "spin 1s linear infinite" : "none" }}>
            <path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {isUpdatingPrices ? "Refreshing..." : "Fetch live prices"}
        </button>
      </div>

      {/* Stat Cards matching Screenshot 4 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        <div className="stat-card">
          <span className="label-mono">PORTFOLIO VALUE</span>
          <span className="stat-value">{currency}{totalValue.toFixed(2)}</span>
          <span className="stat-subtext">Current market valuation</span>
        </div>
        <div className="stat-card">
          <span className="label-mono">TOTAL INVESTED</span>
          <span className="stat-value" style={{ color: "#3b82f6" }}>{currency}{totalInvested.toFixed(2)}</span>
          <span className="stat-subtext">Capital input cost</span>
        </div>
        <div className="stat-card">
          <span className="label-mono">TOTAL PROFIT / LOSS</span>
          <span className="stat-value" style={{ color: totalProfit >= 0 ? "#16a34a" : "#b3666b" }}>
            {totalProfit >= 0 ? "+" : ""}{currency}{totalProfit.toFixed(2)}
          </span>
          <span className="stat-subtext" style={{ color: profitPct >= 0 ? "#16a34a" : "#b3666b", fontWeight: 600 }}>
            {profitPct >= 0 ? "+" : ""}{profitPct.toFixed(1)}% Return
          </span>
        </div>
        <div className="stat-card">
          <span className="label-mono">HOLDINGS COUNT</span>
          <span className="stat-value">{holdingsCount}</span>
          <span className="stat-subtext">Active assets logged</span>
        </div>
      </div>

      {/* Bottom 2-Column Section matching Screenshot 4 */}
      <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "20px", alignItems: "start" }}>
        {/* Left Column Card: ADD ASSET */}
        <div className="bento-card" style={{ position: "relative" }}>
          <span className="label-mono" style={{ marginBottom: "14px", display: "block" }}>ADD ASSET</span>
          <form onSubmit={addInvestment} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Asset Name (e.g. BTC, AAPL)"
                value={invName}
                onChange={(e) => setInvName(e.target.value)}
                required
                style={{ width: "100%" }}
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
                    maxHeight: "180px",
                    overflowY: "auto",
                  }}
                >
                  {invSuggestions.map((s, idx) => (
                    <div
                      key={idx}
                      onClick={() => selectSuggestion(s)}
                      style={{ padding: "6px 8px", cursor: "pointer", fontSize: "11px", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-secondary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <span style={{ fontWeight: 600 }}>{s.symbol || s.name}</span>
                      <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>{s.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <select value={invCategory} onChange={(e) => setInvCategory(e.target.value as InvestmentCategory)} style={{ width: "100%", padding: "8px", fontSize: "12px" }}>
              <option value="equity">Equity (Stock)</option>
              <option value="crypto">Crypto</option>
              <option value="mutual_fund">Mutual Fund</option>
              <option value="sip">SIP</option>
              <option value="gold">Gold</option>
              <option value="cash">Cash / FD</option>
              <option value="other">Other</option>
            </select>

            <input
              type="number"
              placeholder={`Invested Amount (${currency})`}
              value={invAmount}
              onChange={(e) => setInvAmount(e.target.value)}
              step="any"
              required
              style={{ width: "100%" }}
            />

            <input
              type="number"
              placeholder="Quantity Owned"
              value={invQuantity}
              onChange={(e) => setInvQuantity(e.target.value)}
              step="any"
              style={{ width: "100%" }}
            />

            <input
              type="text"
              placeholder="Notes (optional)"
              value={invNotes}
              onChange={(e) => setInvNotes(e.target.value)}
              style={{ width: "100%" }}
            />

            <button type="submit" disabled={isAddingAsset} className="btn-primary" style={{ width: "100%", padding: "10px", marginTop: "4px" }}>
              {isAddingAsset ? "Adding..." : "Add Holding"}
            </button>
          </form>
        </div>

        {/* Right Column Card: HOLDINGS PORTFOLIO Table matching Screenshot 4 */}
        <div className="bento-card" style={{ padding: "20px" }}>
          <span className="label-mono" style={{ marginBottom: "14px", display: "block" }}>HOLDINGS PORTFOLIO</span>

          <div style={{ overflowX: "auto" }}>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Category</th>
                  <th style={{ textAlign: "right" }}>Quantity</th>
                  <th style={{ textAlign: "right" }}>Avg Buy</th>
                  <th style={{ textAlign: "right" }}>Live Price</th>
                  <th style={{ textAlign: "right" }}>Invested</th>
                  <th style={{ textAlign: "right" }}>Current Value</th>
                  <th style={{ textAlign: "right" }}>P&amp;L</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {safeInvestments.map((asset) => {
                  const currentVal = asset.amount || 0;
                  const investedVal = asset.investedAmount || asset.amount || 0;
                  const assetProfit = currentVal - investedVal;
                  const assetProfitPct = investedVal > 0 ? (assetProfit / investedVal) * 100 : 0;
                  const avgBuy = asset.quantity && asset.quantity > 0 ? investedVal / asset.quantity : (asset.buyPrice || 0);

                  return (
                    <tr key={asset.id}>
                      <td style={{ fontWeight: 600 }}>
                        {asset.name}
                        {asset.notes && <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{asset.notes}</p>}
                      </td>
                      <td>
                        <span style={{ fontSize: "10px", fontFamily: "monospace", textTransform: "capitalize", backgroundColor: "var(--bg-secondary)", padding: "2px 6px", borderRadius: "4px" }}>
                          {asset.category}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>{asset.quantity || "—"}</td>
                      <td style={{ textAlign: "right" }}>{avgBuy > 0 ? `${currency}${avgBuy.toFixed(2)}` : "—"}</td>
                      <td style={{ textAlign: "right" }}>{asset.currentPrice ? `${currency}${asset.currentPrice.toFixed(2)}` : "—"}</td>
                      <td style={{ textAlign: "right" }}>{currency}{investedVal.toFixed(2)}</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>{currency}{currentVal.toFixed(2)}</td>
                      <td style={{ textAlign: "right", fontWeight: 600, color: assetProfit >= 0 ? "#16a34a" : "#b3666b" }}>
                        <div>{assetProfit >= 0 ? "+" : ""}{currency}{assetProfit.toFixed(2)}</div>
                        <div style={{ fontSize: "10px" }}>{assetProfitPct >= 0 ? "+" : ""}{assetProfitPct.toFixed(1)}%</div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          onClick={() => deleteInvestment(asset.id)}
                          style={{ backgroundColor: "transparent", border: "none", color: "#b3666b", fontSize: "11px", cursor: "pointer", fontWeight: 500 }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {safeInvestments.length === 0 && (
              <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px", fontSize: "13px" }}>
                {isFetchingInvestments ? "Loading portfolio..." : "No active holdings found."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
