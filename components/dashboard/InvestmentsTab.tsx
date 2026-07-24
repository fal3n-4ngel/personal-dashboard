import React from "react";
import { createPortal } from "react-dom";
import { InvestmentAsset, InvestmentCategory, InvestmentQuote } from "@/types";
import { 
  TrendingUp, 
  TrendingDown, 
  HelpCircle, 
  ShieldAlert, 
  BookOpen, 
  Compass, 
  Info, 
  RotateCw, 
  Plus, 
  Trash2,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Tag
} from "lucide-react";

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
  sellInvestment: (id: string, soldPrice: number) => void;
  isUpdatingPrices: boolean;
  updateMarketPrices: () => void;
  isFetchingInvestments: boolean;
  invSuggestions: InvestmentQuote[];
  setInvSuggestions: (s: InvestmentQuote[]) => void;
  selectSuggestion: (s: InvestmentQuote) => void;
}

const STAT_CARD = "flex flex-col gap-1 rounded-card border border-border-subtle bg-bg-card p-5 shadow-subtle relative overflow-hidden transition-all duration-200 hover:shadow-hover hover:-translate-y-0.5";
const LABEL_MONO = "font-mono text-[10px] font-semibold tracking-[0.8px] text-text-secondary uppercase";
const STAT_VALUE = "text-[28px] font-bold tracking-[-0.5px] text-text-primary";
const STAT_SUBTEXT = "mt-1 text-[11px] text-text-muted";
const BENTO_CARD = "rounded-card border border-border-subtle bg-bg-card p-6 shadow-subtle transition-all duration-200 hover:shadow-hover";
const BTN_PRIMARY = "rounded-md border border-text-primary bg-text-primary px-4 py-2 text-[13px] font-medium text-white transition-all duration-200 hover:border-[#2e2d27] hover:bg-[#2e2d27] active:scale-[0.98]";
const BTN_SECONDARY = "rounded-md border border-border-subtle bg-transparent text-[13px] font-medium text-text-primary transition-all duration-200 hover:bg-bg-primary disabled:cursor-not-allowed disabled:opacity-50";
const INPUT_CLASS = "w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-[13px] text-text-primary outline-none transition-all duration-200 focus:border-border-hover focus:shadow-focus";
const LEDGER_TH = "border-b border-border-subtle bg-bg-card px-3.5 py-3.5 font-mono text-[11px] font-bold tracking-[0.5px] text-text-secondary uppercase";
const LEDGER_TD = "border-b border-border-subtle px-3.5 py-4 align-middle text-[13px] text-text-primary";

interface DynamicFieldConfig {
  amountLabel: string;
  amountPlaceholder: string;
  quantityLabel: string;
  quantityPlaceholder: string;
  buyPriceLabel: string;
  buyPricePlaceholder: string;
  notesLabel: string;
  notesPlaceholder: string;
  description: string;
  trackingTip: string;
}

const getFieldConfig = (category: InvestmentCategory): DynamicFieldConfig => {
  switch (category) {
    case "equity":
      return {
        amountLabel: "Total Invested Capital",
        amountPlaceholder: "Total fiat spent (e.g. 1500)",
        quantityLabel: "Quantity Owned",
        quantityPlaceholder: "Number of shares (e.g. 10)",
        buyPriceLabel: "Avg Purchase Price (Per Unit)",
        buyPricePlaceholder: "Average cost per share (e.g. 150)",
        notesLabel: "Ticker/Broker Details",
        notesPlaceholder: "e.g. Vanguard, Robinhood",
        description: "Equities represent fractional ownership in a corporation. Values fluctuate daily based on stock markets.",
        trackingTip: "💡 Tip: Search for symbols (like AAPL, MSFT) above. Live market rates will track current value & P/L.",
      };
    case "crypto":
      return {
        amountLabel: "Total Invested Capital",
        amountPlaceholder: "Total fiat spent (e.g. 2000)",
        quantityLabel: "Quantity Owned",
        quantityPlaceholder: "Coins / tokens owned (e.g. 0.05)",
        buyPriceLabel: "Avg Purchase Price (Per Coin)",
        buyPricePlaceholder: "Average cost per coin (e.g. 40000)",
        notesLabel: "Exchange / Wallet Details",
        notesPlaceholder: "e.g. Ledger, Coinbase",
        description: "Digital, decentralized assets. Highly volatile but offer high liquid transaction possibilities.",
        trackingTip: "💡 Tip: Search for symbols (like BTC, ETH) above. Live prices update automatically to track returns.",
      };
    case "mutual_fund":
      return {
        amountLabel: "Total Invested Capital",
        amountPlaceholder: "Total fiat spent (e.g. 3000)",
        quantityLabel: "Units Owned (Optional)",
        quantityPlaceholder: "Mutual fund units (e.g. 120.5)",
        buyPriceLabel: "Avg Purchase NAV (Optional)",
        buyPricePlaceholder: "Average Net Asset Value per unit (e.g. 25)",
        notesLabel: "Fund House / Scheme Details",
        notesPlaceholder: "e.g. Fidelity, BlackRock",
        description: "Pooled investments managed by professionals. Diversifies across baskets of stocks/bonds.",
        trackingTip: "💡 Tip: Log the total capital invested and current value to track returns.",
      };
    case "sip":
      return {
        amountLabel: "Total Valuation",
        amountPlaceholder: "Current value of all SIP deposits (e.g. 5000)",
        quantityLabel: "Monthly Installment (Optional)",
        quantityPlaceholder: "Amount invested per period (e.g. 500)",
        buyPriceLabel: "Invested Cost (Optional)",
        buyPricePlaceholder: "Total sum of all installments to date",
        notesLabel: "SIP Schedule / Day",
        notesPlaceholder: "e.g. Monthly on 5th",
        description: "Systematic Investment Plan. A method to invest fixed amounts regularly in mutual funds, averaging out purchase costs.",
        trackingTip: "💡 Tip: SIP automates savings. Periodically update your Total Valuation to reflect fund growth.",
      };
    case "gold":
      return {
        amountLabel: "Total Valuation",
        amountPlaceholder: "Current market value of gold (e.g. 1200)",
        quantityLabel: "Weight in Grams (Optional)",
        quantityPlaceholder: "Gold weight (e.g. 10g, 24k)",
        buyPriceLabel: "Invested Cost (Optional)",
        buyPricePlaceholder: "Original purchase price of gold",
        notesLabel: "Asset Type",
        notesPlaceholder: "e.g. Sovereign Bond, Physical Coin",
        description: "Physical or digital gold. Acting as a classic safe-haven asset, it hedges against inflation & currency devaluation.",
        trackingTip: "💡 Tip: If you own gold bonds or bars, log them here to maintain an overall net worth allocation.",
      };
    case "cash":
      return {
        amountLabel: "Total Valuation / Principal",
        amountPlaceholder: "Bank balance or FD deposit size (e.g. 10000)",
        quantityLabel: "FD Interest Rate (%) (Optional)",
        quantityPlaceholder: "Annual yield (e.g. 6.5)",
        buyPriceLabel: "Original Deposit (Optional)",
        buyPricePlaceholder: "Principal invested if tracking an FD",
        notesLabel: "Bank / Maturity Date",
        notesPlaceholder: "e.g. HDFC Bank, matures 2027-05-12",
        description: "Liquid savings and bank Fixed Deposits (FDs). Low-risk, offering predictable interest rates over time.",
        trackingTip: "💡 Tip: Keep 3-6 months of expenses in Liquid Cash/FDs as an emergency fund before making risky equity plays.",
      };
    default:
      return {
        amountLabel: "Current Valuation",
        amountPlaceholder: "Current value (e.g. 1000)",
        quantityLabel: "Quantity (Optional)",
        quantityPlaceholder: "Number of units",
        buyPriceLabel: "Invested Capital (Optional)",
        buyPricePlaceholder: "Original cost of asset",
        notesLabel: "Asset Details",
        notesPlaceholder: "e.g. Real estate share, private equity",
        description: "Other investments, real estate, collectibles, or alternative asset classes.",
        trackingTip: "💡 Tip: Use this for any custom holdings that do not fall under traditional categories.",
      };
  }
};

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
  sellInvestment,
  isUpdatingPrices,
  updateMarketPrices,
  isFetchingInvestments,
  invSuggestions,
  setInvSuggestions,
  selectSuggestion,
}) => {
  const safeInvestments = Array.isArray(investments) ? investments : [];
  
  // Differentiate active and sold assets
  const activeInvestments = safeInvestments.filter((a) => !a.isSold);
  const soldInvestments = safeInvestments.filter((a) => a.isSold);

  const totalValue = activeInvestments.reduce((acc, a) => acc + (a.amount || 0), 0);
  const totalInvested = activeInvestments.reduce((acc, a) => acc + (a.investedAmount || a.amount || 0), 0);
  const totalProfit = totalValue - totalInvested;
  const profitPct = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
  const holdingsCount = activeInvestments.length;

  // Realized stats from sold assets
  const totalRealizedCost = soldInvestments.reduce((acc, a) => acc + (a.investedAmount || 0), 0);
  const totalRealizedReturn = soldInvestments.reduce((acc, a) => acc + (a.soldPrice || 0), 0);
  const totalRealizedProfit = totalRealizedReturn - totalRealizedCost;
  const realizedProfitPct = totalRealizedCost > 0 ? (totalRealizedProfit / totalRealizedCost) * 100 : 0;

  const trackableForDaily = activeInvestments.filter((a) => a.quantity && a.currentPrice != null && a.previousClose != null);
  const hasDailyData = trackableForDaily.length > 0;
  const todaysPnl = trackableForDaily.reduce((acc, a) => acc + a.quantity! * (a.currentPrice! - a.previousClose!), 0);
  const yesterdayTrackedValue = trackableForDaily.reduce((acc, a) => acc + a.quantity! * a.previousClose!, 0);
  const todaysPnlPct = yesterdayTrackedValue > 0 ? (todaysPnl / yesterdayTrackedValue) * 100 : 0;

  // Guide Tabs
  const [activeGuideTab, setActiveGuideTab] = React.useState<"allocations" | "classes" | "advice">("allocations");
  const [selectedRiskProfile, setSelectedRiskProfile] = React.useState<"conservative" | "balanced" | "aggressive">("balanced");

  // Sell Modal States
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const [showSellModal, setShowSellModal] = React.useState(false);
  const [sellAssetId, setSellAssetId] = React.useState<string | null>(null);
  const [sellAssetName, setSellAssetName] = React.useState("");
  const [sellPriceInput, setSellPriceInput] = React.useState("");
  const [sellError, setSellError] = React.useState<string | null>(null);

  const categoryColors: Record<InvestmentCategory, string> = {
    equity: "#2563eb",       // Deep Professional Blue
    crypto: "#7c3aed",       // Crypto Purple
    mutual_fund: "#0284c7",  // Sky Blue
    sip: "#0d9488",          // Teal
    gold: "#d97706",         // Gold/Amber
    cash: "#059669",         // Emerald Bank Green
    other: "#4b5563",        // Muted Slate
  };

  const categoryLabels: Record<InvestmentCategory, string> = {
    equity: "Stocks / Equity",
    crypto: "Cryptocurrency",
    mutual_fund: "Mutual Funds",
    sip: "SIP (Recurring MF)",
    gold: "Gold / Precious Metals",
    cash: "Cash & Fixed Deposits (FD)",
    other: "Other Assets",
  };

  const categoryTotals: Record<InvestmentCategory, number> = {
    equity: 0,
    crypto: 0,
    mutual_fund: 0,
    sip: 0,
    gold: 0,
    cash: 0,
    other: 0,
  };

  activeInvestments.forEach((asset) => {
    const cat = asset.category || "other";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + (asset.amount || 0);
  });

  const activeCategories = Object.entries(categoryTotals)
    .filter(([, val]) => val > 0)
    .sort((a, b) => b[1] - a[1]) as [InvestmentCategory, number][];

  // Donut values
  const radius = 35;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const segmentPercents = activeCategories.map(([, val]) => (totalValue > 0 ? val / totalValue : 0));
  const donutSegments = activeCategories.map(([cat, val], idx) => {
    const percent = segmentPercents[idx];
    const priorSum = segmentPercents.slice(0, idx).reduce((a, b) => a + b, 0);
    const strokeLength = percent * circumference;
    const strokeOffset = circumference - strokeLength + priorSum * circumference;
    return {
      category: cat,
      color: categoryColors[cat] || "#6b7280",
      percent: percent * 100,
      value: val,
      strokeDasharray: `${strokeLength} ${circumference}`,
      strokeDashoffset: strokeOffset,
    };
  });

  const rankedByReturn = activeInvestments
    .map((a) => {
      const current = a.amount || 0;
      const invested = a.investedAmount || a.amount || 0;
      const pct = invested > 0 ? ((current - invested) / invested) * 100 : 0;
      return { ...a, pct };
    })
    .sort((a, b) => b.pct - a.pct);
  const bestPerformer = rankedByReturn[0];
  const worstPerformer = rankedByReturn.length > 1 ? rankedByReturn[rankedByReturn.length - 1] : null;

  const largestHolding = [...activeInvestments].sort((a, b) => (b.amount || 0) - (a.amount || 0))[0];
  const largestHoldingPct = totalValue > 0 && largestHolding ? ((largestHolding.amount || 0) / totalValue) * 100 : 0;

  // Grouped Categories for Strategy comparison
  const actualGroupTotals = {
    cash: categoryTotals["cash"] || 0,
    gold: categoryTotals["gold"] || 0,
    mutual_fund: (categoryTotals["mutual_fund"] || 0) + (categoryTotals["sip"] || 0),
    equity: categoryTotals["equity"] || 0,
    crypto: categoryTotals["crypto"] || 0,
    other: categoryTotals["other"] || 0,
  };

  const groupLabels = {
    cash: "Cash & FDs",
    gold: "Gold",
    mutual_fund: "Mutual Funds / SIP",
    equity: "Stocks / Equity",
    crypto: "Crypto",
    other: "Other Assets",
  };

  const targetModels = {
    conservative: { cash: 50, gold: 15, mutual_fund: 30, equity: 5, crypto: 0, other: 0 },
    balanced: { cash: 25, gold: 10, mutual_fund: 45, equity: 20, crypto: 0, other: 0 },
    aggressive: { cash: 10, gold: 5, mutual_fund: 35, equity: 45, crypto: 5, other: 0 },
  };

  const currentFieldConfig = getFieldConfig(invCategory);

  // Asset Coach tips generator
  const getCoachTips = () => {
    const tips: { type: "info" | "warning" | "success"; text: string }[] = [];
    if (holdingsCount === 0) {
      tips.push({
        type: "info",
        text: "👋 Welcome to your portfolio coach! Start your journey by logging assets. For low-risk guaranteed returns, consider a Fixed Deposit (FD). To grow long-term wealth, set up a recurring Mutual Fund SIP."
      });
      return tips;
    }

    // 1. Diversification Check
    const maxGroup = Object.entries(actualGroupTotals).sort((a, b) => b[1] - a[1])[0];
    const maxGroupPct = totalValue > 0 ? (maxGroup[1] / totalValue) * 100 : 0;
    if (maxGroupPct > 60) {
      tips.push({
        type: "warning",
        text: `⚠️ Concentration Risk: Your portfolio is heavily concentrated in ${groupLabels[maxGroup[0] as keyof typeof groupLabels]} (${maxGroupPct.toFixed(1)}%). Consider diversifying to manage risk.`
      });
    } else {
      tips.push({
        type: "success",
        text: "✅ Healthy Diversification: Your capital is nicely spread across different asset categories, mitigating sector-specific drawdowns."
      });
    }

    // 2. Emergency Fund Check
    const cashPct = totalValue > 0 ? (actualGroupTotals.cash / totalValue) * 100 : 0;
    if (cashPct < 15) {
      tips.push({
        type: "warning",
        text: `⚠️ Low Liquidity Reserve: Cash & FDs make up only ${cashPct.toFixed(1)}% of your portfolio. Financial coaches advise holding 3-6 months of basic living expenses in liquid accounts before buying riskier equity/crypto assets.`
      });
    } else {
      tips.push({
        type: "success",
        text: `✅ Solid Emergency Buffer: Your liquid cash/FD allocation is at ${cashPct.toFixed(1)}%, ensuring you won't be forced to sell assets during a short-term cash crunch.`
      });
    }

    // 3. Crypto Exposure Check
    const cryptoPct = totalValue > 0 ? (actualGroupTotals.crypto / totalValue) * 100 : 0;
    if (cryptoPct > 12) {
      tips.push({
        type: "warning",
        text: `⚡ High Speculation Risk: Cryptocurrencies account for ${cryptoPct.toFixed(1)}% of your investments. Due to high volatility, consider keeping speculative assets below 5-10% of your total net worth.`
      });
    }

    // 4. Growth Assets check
    const growthPct = totalValue > 0 ? ((actualGroupTotals.equity + actualGroupTotals.mutual_fund) / totalValue) * 100 : 0;
    if (growthPct === 0) {
      tips.push({
        type: "info",
        text: "💡 Long-term Growth Tip: You hold no stocks or mutual funds. While cash is safe, it loses purchasing power to inflation. Consider starting a small, monthly SIP in a diversified index fund."
      });
    }

    return tips;
  };

  const handleSellClick = (id: string, defaultPrice: number, name: string) => {
    setSellAssetId(id);
    setSellAssetName(name);
    setSellPriceInput(defaultPrice.toFixed(2));
    setSellError(null);
    setShowSellModal(true);
  };

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Wealth & Portfolio Management</h1>
          <p className="mt-1 text-xs text-text-secondary">
            Manage your holdings, learn investment principles, and optimize asset allocation.
          </p>
        </div>
        <button
          onClick={updateMarketPrices}
          disabled={isUpdatingPrices || holdingsCount === 0}
          className={`${BTN_PRIMARY} flex items-center gap-1.5 px-4 py-2 text-xs`}
        >
          <RotateCw className={`h-3.5 w-3.5 ${isUpdatingPrices ? "animate-spin" : ""}`} />
          {isUpdatingPrices ? "Updating Market..." : "Sync Live Prices"}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <div className={STAT_CARD}>
          <span className={LABEL_MONO}>PORTFOLIO VALUE</span>
          <span className={STAT_VALUE}>{currency}{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className={STAT_SUBTEXT}>Current market valuation</span>
          <div className="absolute right-3 top-3 h-10 w-10 text-border-subtle/40 pointer-events-none">
            <DollarSign className="h-full w-full" />
          </div>
        </div>
        <div className={STAT_CARD}>
          <span className={LABEL_MONO}>TOTAL INVESTED</span>
          <span className={`${STAT_VALUE} text-accent-blue`}>{currency}{totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className={STAT_SUBTEXT}>Total net capital inputs</span>
        </div>
        <div className={STAT_CARD}>
          <span className={LABEL_MONO}>UNREALIZED P&amp;L</span>
          <span className={STAT_VALUE} style={{ color: totalProfit >= 0 ? "#16a34a" : "#b3666b" }}>
            {totalProfit >= 0 ? "+" : ""}{currency}{totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <div className="mt-1 flex items-center gap-1">
            {totalProfit >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-[#16a34a]" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-[#b3666b]" />
            )}
            <span className="text-[11px] font-bold" style={{ color: totalProfit >= 0 ? "#16a34a" : "#b3666b" }}>
              {profitPct >= 0 ? "+" : ""}{profitPct.toFixed(2)}% Return
            </span>
          </div>
        </div>
        <div className={STAT_CARD}>
          <span className={LABEL_MONO}>REALIZED PROFIT</span>
          <span className={STAT_VALUE} style={{ color: totalRealizedProfit >= 0 ? "#16a34a" : "#b3666b" }}>
            {totalRealizedProfit >= 0 ? "+" : ""}{currency}{totalRealizedProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="mt-1 text-[11px] font-semibold text-text-muted">
            From {soldInvestments.length} closed asset{soldInvestments.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className={STAT_CARD}>
          <span className={LABEL_MONO}>TODAY&apos;S MOVEMENT</span>
          {hasDailyData ? (
            <>
              <span className={STAT_VALUE} style={{ color: todaysPnl >= 0 ? "#16a34a" : "#b3666b" }}>
                {todaysPnl >= 0 ? "+" : ""}{currency}{todaysPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="mt-1 text-[11px] font-bold flex items-center gap-1" style={{ color: todaysPnl >= 0 ? "#16a34a" : "#b3666b" }}>
                {todaysPnl >= 0 ? "▲" : "▼"} {todaysPnlPct.toFixed(2)}% Today
              </span>
            </>
          ) : (
            <>
              <span className="text-[15px] font-bold text-text-muted pt-2">—</span>
              <span className={STAT_SUBTEXT}>Live sync needed for daily delta</span>
            </>
          )}
        </div>
      </div>

      {/* Wealth Analytics & Allocation Section */}
      <div className="grid grid-cols-[1.3fr_1fr] gap-5 max-md:grid-cols-1">
        {/* Allocation Donut Chart */}
        <div className={BENTO_CARD}>
          <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-4">
            <h2 className="text-[14px] font-bold tracking-tight text-text-primary flex items-center gap-1.5">
              <Compass className="h-4.5 w-4.5 text-text-secondary" /> Current Asset Allocation
            </h2>
            <span className="rounded bg-bg-secondary px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
              {holdingsCount} Active Asset{holdingsCount !== 1 ? "s" : ""}
            </span>
          </div>
          {activeInvestments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <span className="text-3xl mb-2">📊</span>
              <p className="text-xs text-text-muted font-medium">No assets logged to calculate allocation.</p>
            </div>
          ) : (
            <div className="flex items-center gap-8 max-sm:flex-col max-sm:gap-6">
              {/* Donut SVG */}
              <div className="relative flex h-[130px] w-[130px] shrink-0 items-center justify-center">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke="var(--border-subtle, #eae8e0)"
                    strokeWidth={strokeWidth}
                  />
                  {donutSegments.map((seg, idx) => (
                    <circle
                      key={idx}
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      strokeLinecap="round"
                    />
                  ))}
                </svg>
                {/* Center Label */}
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-[9px] font-semibold text-text-muted tracking-[0.5px] uppercase">Net Worth</span>
                  <span className="text-[14px] font-bold text-text-primary mt-0.5">{currency}{(totalValue / 1000).toFixed(0)}k</span>
                </div>
              </div>

              {/* Legend Grid */}
              <div className="grid flex-1 grid-cols-1 gap-2.5 text-xs">
                {donutSegments.map((seg, idx) => (
                  <div key={idx} className="flex items-center justify-between min-w-0 border-b border-border-subtle/30 pb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
                      <span className="min-w-0 truncate text-text-secondary font-medium">
                        {categoryLabels[seg.category] || seg.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-text-muted">{currency}{seg.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      <span className="font-bold text-text-primary text-[12px]">
                        {seg.percent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance Highlights */}
          {activeInvestments.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-border-subtle">
              <div className="rounded-lg bg-emerald-50/40 border border-emerald-200/50 p-3 flex flex-col gap-0.5">
                <span className="text-[9px] font-mono font-bold tracking-[0.5px] text-emerald-800 uppercase">Best Return</span>
                <span className="truncate text-[13px] font-bold text-text-primary leading-tight">{bestPerformer.name}</span>
                <span className="text-[12px] font-bold text-emerald-700 mt-1 font-mono">
                  {bestPerformer.pct >= 0 ? "+" : ""}{bestPerformer.pct.toFixed(2)}%
                </span>
              </div>
              {worstPerformer && (
                <div className={`rounded-lg p-3 flex flex-col gap-0.5 border ${
                  worstPerformer.pct < 0 ? "bg-rose-50/40 border-rose-200/50" : "bg-bg-secondary border-border-subtle"
                }`}>
                  <span className={`text-[9px] font-mono font-bold tracking-[0.5px] uppercase ${
                    worstPerformer.pct < 0 ? "text-rose-800" : "text-text-secondary"
                  }`}>Worst Return</span>
                  <span className="truncate text-[13px] font-bold text-text-primary leading-tight">{worstPerformer.name}</span>
                  <span className={`text-[12px] font-bold mt-1 font-mono ${
                    worstPerformer.pct < 0 ? "text-rose-700" : "text-text-primary"
                  }`}>
                    {worstPerformer.pct >= 0 ? "+" : ""}{worstPerformer.pct.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Financial Strategy Coach & Education Hub */}
        <div className={BENTO_CARD}>
          <div className="flex items-center gap-1 border-b border-border-subtle pb-3 mb-4">
            <button
              onClick={() => setActiveGuideTab("allocations")}
              className={`px-3 py-1 text-xs font-semibold rounded-md border-none cursor-pointer transition-all ${
                activeGuideTab === "allocations" ? "bg-text-primary text-white shadow-sm" : "bg-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              Target Allocation
            </button>
            <button
              onClick={() => setActiveGuideTab("classes")}
              className={`px-3 py-1 text-xs font-semibold rounded-md border-none cursor-pointer transition-all ${
                activeGuideTab === "classes" ? "bg-text-primary text-white shadow-sm" : "bg-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              Asset Classes
            </button>
            <button
              onClick={() => setActiveGuideTab("advice")}
              className={`px-3 py-1 text-xs font-semibold rounded-md border-none cursor-pointer transition-all ${
                activeGuideTab === "advice" ? "bg-text-primary text-white shadow-sm" : "bg-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              Advisor Coach
            </button>
          </div>

          {/* Guide Content: Target Allocation */}
          {activeGuideTab === "allocations" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-text-primary">Compare Risk Profile:</span>
                <div className="flex gap-1 rounded bg-bg-secondary p-0.5">
                  {(["conservative", "balanced", "aggressive"] as const).map((profile) => (
                    <button
                      key={profile}
                      onClick={() => setSelectedRiskProfile(profile)}
                      className={`cursor-pointer rounded px-2 py-0.5 text-[9.5px] font-bold border-none capitalize transition-all ${
                        selectedRiskProfile === profile ? "bg-white text-text-primary shadow-sm" : "bg-transparent text-text-muted hover:text-text-primary"
                      }`}
                    >
                      {profile}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress bars comparing Actual vs Target */}
              <div className="flex flex-col gap-3 mt-1.5">
                {Object.entries(targetModels[selectedRiskProfile]).map(([groupKey, targetPct]) => {
                  const actualVal = actualGroupTotals[groupKey as keyof typeof actualGroupTotals] || 0;
                  const actualPct = totalValue > 0 ? (actualVal / totalValue) * 100 : 0;
                  
                  if (targetPct === 0 && actualPct === 0) return null;

                  return (
                    <div key={groupKey} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-text-secondary">{groupLabels[groupKey as keyof typeof groupLabels]}</span>
                        <div className="font-mono text-text-primary">
                          <span className="font-bold">{actualPct.toFixed(0)}%</span>
                          <span className="text-text-muted mx-1">/</span>
                          <span className="text-text-secondary">{targetPct}% Target</span>
                        </div>
                      </div>
                      <div className="relative h-2 w-full rounded bg-bg-secondary overflow-hidden">
                        {/* Target marker */}
                        <div 
                          className="absolute top-0 bottom-0 w-0.5 bg-text-secondary/40 z-10"
                          style={{ left: `${targetPct}%` }}
                        />
                        {/* Actual progress */}
                        <div 
                          className="h-full rounded transition-all duration-300"
                          style={{ 
                            width: `${actualPct}%`,
                            backgroundColor: Math.abs(actualPct - targetPct) < 8 ? "#10b981" : "#3b82f6" 
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-2 rounded-lg bg-bg-secondary/40 border border-border-subtle p-3 text-[11px] leading-relaxed text-text-secondary flex items-start gap-2">
                <Info className="h-4.5 w-4.5 shrink-0 text-text-muted mt-0.5" />
                <span>
                  {selectedRiskProfile === "conservative" && "Conservative models favor high stability. Recommended for preserving capital, avoiding heavy stock market drawdowns, or when cash is needed in <2 years."}
                  {selectedRiskProfile === "balanced" && "Balanced portfolios offset market swings by combining growth assets (Stocks/SIPs) with solid safety buffers (Fixed Deposits/Cash). Suitable for mid-to-long term goals."}
                  {selectedRiskProfile === "aggressive" && "Aggressive portfolios target long-term compounding growth via equities and crypto, accepting short-term volatility. Ideal for 5+ year time horizons."}
                </span>
              </div>
            </div>
          )}

          {/* Guide Content: Asset Classes Explanation */}
          {activeGuideTab === "classes" && (
            <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
              <div className="border-l-2 border-l-[#2563eb] pl-2 py-0.5">
                <span className="font-bold text-[12px] text-text-primary block">Equities & Stocks (Equity)</span>
                <p className="text-[10.5px] leading-relaxed text-text-secondary mt-0.5">
                  Buying pieces of individual companies. Offers high long-term gains, but values go up and down daily. Track using unit quantities and buy prices.
                </p>
              </div>
              <div className="border-l-2 border-l-[#0284c7] pl-2 py-0.5">
                <span className="font-bold text-[12px] text-text-primary block">Mutual Funds & SIPs</span>
                <p className="text-[10.5px] leading-relaxed text-text-secondary mt-0.5">
                  Pooled funds managed by institutional experts. **SIP** is a systematic plan where you invest a fixed amount regularly (e.g. monthly) to build wealth continuously.
                </p>
              </div>
              <div className="border-l-2 border-l-[#059669] pl-2 py-0.5">
                <span className="font-bold text-[12px] text-text-primary block">Fixed Deposits (FD) & Cash</span>
                <p className="text-[10.5px] leading-relaxed text-text-secondary mt-0.5">
                  Risk-free assets. FDs lock your money in a bank at a guaranteed interest rate (e.g. 6-7%). Use these to maintain a steady emergency cash reserve.
                </p>
              </div>
              <div className="border-l-2 border-l-[#7c3aed] pl-2 py-0.5">
                <span className="font-bold text-[12px] text-text-primary block">Cryptocurrency</span>
                <p className="text-[10.5px] leading-relaxed text-text-secondary mt-0.5">
                  Digital decentralized assets like Bitcoin or Ethereum. Highly speculative with huge price swings. Best limited to small, fun allocations.
                </p>
              </div>
            </div>
          )}

          {/* Guide Content: AI Advisory Coach */}
          {activeGuideTab === "advice" && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-text-primary">Portfolio Evaluation & Tips:</span>
              <div className="flex flex-col gap-2 max-h-[190px] overflow-y-auto pr-1">
                {getCoachTips().map((tip, idx) => (
                  <div 
                    key={idx} 
                    className={`rounded-lg border p-3 text-[11px] leading-normal flex items-start gap-2 ${
                      tip.type === "warning" 
                        ? "bg-rose-50/40 border-rose-200/50 text-rose-800" 
                        : tip.type === "success" 
                          ? "bg-emerald-50/40 border-emerald-200/50 text-emerald-800" 
                          : "bg-blue-50/30 border-blue-200/40 text-blue-800"
                    }`}
                  >
                    {tip.type === "warning" && <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />}
                    {tip.type === "success" && <CheckCircle2 className="h-4.5 w-4.5 shrink-0 mt-0.5" />}
                    {tip.type === "info" && <Info className="h-4.5 w-4.5 shrink-0 mt-0.5" />}
                    <span>{tip.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom 2-Column Section */}
      <div className="grid grid-cols-[290px_1fr] items-start gap-5 max-md:grid-cols-1">
        {/* Left Column Card: ADD ASSET */}
        <div className={`${BENTO_CARD} relative`}>
          <div className="flex items-center gap-1.5 border-b border-border-subtle pb-3 mb-4">
            <Plus className="h-4.5 w-4.5 text-text-secondary" />
            <span className={LABEL_MONO}>Add Investment</span>
          </div>
          
          {/* Helper class indicator block */}
          <div className="mb-4 rounded bg-bg-secondary p-3 text-[10.5px] leading-relaxed text-text-secondary border border-border-subtle/50">
            <span className="font-bold text-text-primary block mb-0.5 capitalize">
              {categoryLabels[invCategory]}
            </span>
            {currentFieldConfig.description}
          </div>

          <form onSubmit={addInvestment} className="flex flex-col gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Asset / Fund Ticker (e.g. BTC, AAPL)"
                value={invName}
                onChange={(e) => setInvName(e.target.value)}
                required
                className={INPUT_CLASS}
              />
              {invSuggestions.length > 0 && (
                <div className="absolute top-full right-0 left-0 z-[100] mt-1 max-h-[180px] overflow-y-auto rounded-lg border border-border-subtle bg-bg-card p-1 shadow-md">
                  {invSuggestions.map((s, idx) => (
                    <div
                      key={idx}
                      onClick={() => selectSuggestion(s)}
                      className="flex cursor-pointer justify-between rounded px-2.5 py-2 text-[11px] hover:bg-bg-secondary"
                    >
                      <span className="font-bold text-text-primary">{s.symbol || s.name}</span>
                      <span className="text-[10px] text-text-muted truncate max-w-[150px]">{s.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-text-secondary uppercase px-0.5">Asset Category</span>
              <select 
                value={invCategory} 
                onChange={(e) => setInvCategory(e.target.value as InvestmentCategory)} 
                className={`${INPUT_CLASS} cursor-pointer text-xs`}
              >
                <option value="equity">Equity (Stocks)</option>
                <option value="mutual_fund">Mutual Fund</option>
                <option value="sip">SIP (Recurring MF)</option>
                <option value="cash">Fixed Deposit / Cash</option>
                <option value="crypto">Cryptocurrency</option>
                <option value="gold">Gold</option>
                <option value="other">Other Asset</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-text-secondary uppercase px-0.5">
                {currentFieldConfig.amountLabel}
              </span>
              <input
                type="number"
                placeholder={currentFieldConfig.amountPlaceholder}
                value={invAmount}
                onChange={(e) => setInvAmount(e.target.value)}
                step="any"
                required
                className={INPUT_CLASS}
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-text-secondary uppercase px-0.5">
                {currentFieldConfig.quantityLabel}
              </span>
              <input
                type="number"
                placeholder={currentFieldConfig.quantityPlaceholder}
                value={invQuantity}
                onChange={(e) => setInvQuantity(e.target.value)}
                step="any"
                className={INPUT_CLASS}
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-text-secondary uppercase px-0.5">
                {currentFieldConfig.buyPriceLabel}
              </span>
              <input
                type="text"
                placeholder={currentFieldConfig.buyPricePlaceholder}
                value={invBuyPrice}
                onChange={(e) => setInvBuyPrice(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-text-secondary uppercase px-0.5">
                {currentFieldConfig.notesLabel}
              </span>
              <input
                type="text"
                placeholder={currentFieldConfig.notesPlaceholder}
                value={invNotes}
                onChange={(e) => setInvNotes(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            {/* Micro-tip helper text */}
            <span className="text-[9.5px] leading-normal text-text-secondary italic mt-1">
              {currentFieldConfig.trackingTip}
            </span>

            <button type="submit" disabled={isAddingAsset} className={`${BTN_PRIMARY} mt-2 w-full py-2.5`}>
              {isAddingAsset ? "Adding Holding..." : "Add to Portfolio"}
            </button>
          </form>
        </div>

        {/* Right Column Card: HOLDINGS PORTFOLIO Table */}
        <div className="flex flex-col gap-5 overflow-hidden">
          {/* Active Holdings Table */}
          <div className={`${BENTO_CARD} p-5`}>
            <div className="flex items-center justify-between border-b border-border-subtle pb-3.5 mb-4">
              <span className={LABEL_MONO}>Active Holdings Ledger</span>
              <span className="text-[10.5px] text-text-muted italic">Values in {currency}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    <th className={LEDGER_TH}>Asset</th>
                    <th className={LEDGER_TH}>Category</th>
                    <th className={`${LEDGER_TH} text-right`}>Holdings</th>
                    <th className={`${LEDGER_TH} text-right`}>Purchase Cost</th>
                    <th className={`${LEDGER_TH} text-right`}>Market Value</th>
                    <th className={`${LEDGER_TH} text-right`}>Returns (P&amp;L)</th>
                    <th className={`${LEDGER_TH} text-right`}>Day Change</th>
                    <th className={`${LEDGER_TH} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeInvestments.map((asset) => {
                    const currentVal = asset.amount || 0;
                    const investedVal = asset.investedAmount || asset.amount || 0;
                    const assetProfit = currentVal - investedVal;
                    const assetProfitPct = investedVal > 0 ? (assetProfit / investedVal) * 100 : 0;
                    const avgBuy = asset.quantity && asset.quantity > 0 ? investedVal / asset.quantity : (asset.buyPrice || 0);
                    const hasDayChange = !!asset.quantity && asset.currentPrice != null && asset.previousClose != null;
                    const dayChange = hasDayChange ? asset.quantity! * (asset.currentPrice! - asset.previousClose!) : null;
                    const dayChangePct = hasDayChange && asset.previousClose! > 0 ? ((asset.currentPrice! - asset.previousClose!) / asset.previousClose!) * 100 : null;

                    return (
                      <tr key={asset.id} className="hover:bg-bg-secondary/40 transition-colors">
                        <td className={`${LEDGER_TD} font-bold`}>
                          {asset.name}
                          {asset.notes && <p className="mt-1 text-[10px] text-text-muted font-normal">{asset.notes}</p>}
                        </td>
                        <td className={LEDGER_TD}>
                          <span 
                            className="rounded px-2 py-0.5 font-mono text-[9px] font-bold text-white uppercase"
                            style={{ backgroundColor: categoryColors[asset.category] || "#6b7280" }}
                          >
                            {asset.category === "sip" ? "SIP" : asset.category === "mutual_fund" ? "MF" : asset.category}
                          </span>
                        </td>
                        <td className={`${LEDGER_TD} text-right font-mono font-medium`}>
                          {asset.quantity ? asset.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "—"}
                        </td>
                        <td className={`${LEDGER_TD} text-right font-mono`}>
                          <div>{currency}{investedVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          {asset.quantity && avgBuy > 0 && (
                            <div className="text-[10px] text-text-muted mt-0.5">@{currency}{avgBuy.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                          )}
                        </td>
                        <td className={`${LEDGER_TD} text-right font-mono font-semibold`}>
                          <div>{currency}{currentVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          {asset.currentPrice && (
                            <div className="text-[10px] text-text-muted mt-0.5">@{currency}{asset.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                          )}
                        </td>
                        <td className={`${LEDGER_TD} text-right font-semibold font-mono`} style={{ color: assetProfit >= 0 ? "#16a34a" : "#b3666b" }}>
                          <div>{assetProfit >= 0 ? "+" : ""}{currency}{assetProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          <div className="text-[10px] font-bold">{assetProfitPct >= 0 ? "+" : ""}{assetProfitPct.toFixed(2)}%</div>
                        </td>
                        <td
                          className={`${LEDGER_TD} text-right font-mono ${dayChange !== null ? "font-semibold" : ""}`}
                          style={dayChange !== null ? { color: dayChange >= 0 ? "#16a34a" : "#b3666b" } : undefined}
                        >
                          {dayChange !== null ? (
                            <>
                              <div>{dayChange >= 0 ? "+" : ""}{currency}{dayChange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                              {dayChangePct !== null && <div className="text-[10px] font-bold">{dayChangePct >= 0 ? "+" : ""}{dayChangePct.toFixed(2)}%</div>}
                            </>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                        <td className={LEDGER_TD}>
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => handleSellClick(asset.id, currentVal, asset.name)}
                              className="border-none bg-transparent hover:bg-emerald-50 p-1.5 rounded-md cursor-pointer text-text-secondary hover:text-[#16a34a] transition-all"
                              title="Mark as Sold Today"
                            >
                              <Tag className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteInvestment(asset.id)}
                              className="border-none bg-transparent hover:bg-rose-50 p-1.5 rounded-md cursor-pointer text-text-muted hover:text-[#b3666b] transition-all"
                              title="Delete holding"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={2} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {activeInvestments.length === 0 && (
                <div className="flex flex-col items-center justify-center p-10 text-center">
                  <span className="text-2xl mb-2">📁</span>
                  <p className="text-[13px] text-text-muted font-medium">
                    {isFetchingInvestments ? "Loading portfolio ledger..." : "No active holdings found. Fill out the form to add your first asset."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sold / Realized History Table */}
          {soldInvestments.length > 0 && (
            <div className={`${BENTO_CARD} p-5 border-t-2 border-t-emerald-600`}>
              <div className="flex items-center justify-between border-b border-border-subtle pb-3.5 mb-4">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">Realized History</span>
                  <span className={LABEL_MONO}>Closed Positions Ledger</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 font-mono">
                  Cumulative P&amp;L: {totalRealizedProfit >= 0 ? "+" : ""}{currency}{totalRealizedProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })} ({realizedProfitPct >= 0 ? "+" : ""}{realizedProfitPct.toFixed(2)}%)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr>
                      <th className={LEDGER_TH}>Asset</th>
                      <th className={LEDGER_TH}>Category</th>
                      <th className={`${LEDGER_TH} text-right`}>Capital Invested</th>
                      <th className={`${LEDGER_TH} text-right`}>Sale Realized</th>
                      <th className={`${LEDGER_TH} text-right`}>Realized Gain/Loss</th>
                      <th className={`${LEDGER_TH} text-right`}>Date Sold</th>
                      <th className={`${LEDGER_TH} text-right`}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {soldInvestments.map((asset) => {
                      const cost = asset.investedAmount || 0;
                      const sale = asset.soldPrice || 0;
                      const pnl = sale - cost;
                      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
                      const dateStr = asset.soldAt ? new Date(asset.soldAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

                      return (
                        <tr key={asset.id} className="bg-bg-secondary/20 hover:bg-bg-secondary/40 transition-colors">
                          <td className={`${LEDGER_TD} font-semibold text-text-secondary`}>
                            {asset.name}
                            {asset.notes && <p className="mt-0.5 text-[9.5px] text-text-muted font-normal">{asset.notes}</p>}
                          </td>
                          <td className={LEDGER_TD}>
                            <span 
                              className="rounded px-1.5 py-0.5 font-mono text-[8.5px] font-semibold text-white uppercase opacity-70"
                              style={{ backgroundColor: categoryColors[asset.category] || "#6b7280" }}
                            >
                              {asset.category}
                            </span>
                          </td>
                          <td className={`${LEDGER_TD} text-right font-mono text-text-secondary`}>
                            {currency}{cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className={`${LEDGER_TD} text-right font-mono font-medium text-emerald-800`}>
                            {currency}{sale.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className={`${LEDGER_TD} text-right font-semibold font-mono`} style={{ color: pnl >= 0 ? "#16a34a" : "#b3666b" }}>
                            <div>{pnl >= 0 ? "+" : ""}{currency}{pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <div className="text-[10px] font-bold">{pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%</div>
                          </td>
                          <td className={`${LEDGER_TD} text-right font-mono text-text-muted`}>
                            {dateStr}
                          </td>
                          <td className={LEDGER_TD}>
                            <button
                              onClick={() => deleteInvestment(asset.id)}
                              className="border-none bg-transparent hover:bg-rose-50 p-1.5 rounded-md cursor-pointer text-text-muted hover:text-[#b3666b] transition-all"
                              title="Delete permanently from history"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={2} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {mounted && showSellModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity animate-[fadeIn_0.15s_ease-out]">
          <div className="w-full max-w-md rounded-xl border border-border-subtle bg-bg-card p-6 shadow-2xl animate-[fadeIn_0.2s_ease-out]">
            <h3 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-2">
              <Tag className="h-4.5 w-4.5 text-[#16a34a]" /> Confirm Asset Sale
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed mb-4">
              Marking <strong className="text-text-primary">{sellAssetName}</strong> as sold today. Please enter the total sale price received:
            </p>
            <div className="flex flex-col gap-1 mb-5">
              <label className="text-[10px] font-semibold text-text-secondary uppercase px-0.5">Sale Value ({currency})</label>
              <input
                type="number"
                step="any"
                required
                value={sellPriceInput}
                onChange={(e) => {
                  setSellPriceInput(e.target.value);
                  setSellError(null);
                }}
                className={INPUT_CLASS}
                autoFocus
              />
              {sellError && (
                <span className="text-[10px] text-rose-600 font-semibold px-0.5 mt-1">
                  {sellError}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  const price = parseFloat(sellPriceInput);
                  if (!isNaN(price) && price >= 0) {
                    if (sellAssetId) {
                      sellInvestment(sellAssetId, price);
                    }
                    setShowSellModal(false);
                    setSellAssetId(null);
                  } else {
                    setSellError("Please enter a valid numeric sale price.");
                  }
                }}
                className={`${BTN_PRIMARY} w-full py-2.5 text-xs font-semibold`}
              >
                Confirm Sale
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSellModal(false);
                  setSellAssetId(null);
                  setSellError(null);
                }}
                className={`${BTN_SECONDARY} w-full py-2.5 text-xs font-semibold`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
