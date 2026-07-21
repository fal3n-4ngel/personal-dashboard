import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Helper to normalize crypto names to Binance symbols
function getBinanceSymbol(name: string): string | null {
  const clean = name.trim().toUpperCase();
  if (['BTC', 'BITCOIN'].includes(clean)) return 'BTCUSDT';
  if (['ETH', 'ETHEREUM'].includes(clean)) return 'ETHUSDT';
  if (['SOL', 'SOLANA'].includes(clean)) return 'SOLUSDT';
  if (['ADA', 'CARDANO'].includes(clean)) return 'ADAUSDT';
  if (['DOGE', 'DOGECOIN'].includes(clean)) return 'DOGEUSDT';
  if (['XRP'].includes(clean)) return 'XRPUSDT';
  if (['BNB'].includes(clean)) return 'BNBUSDT';
  
  // Generic fallback if it looks like a symbol
  if (clean.length >= 3 && clean.length <= 5) {
    return `${clean}USDT`;
  }
  return null;
}

// Helper to map stock names to Yahoo Finance tickers
function getYahooTicker(name: string): string {
  const clean = name.trim().toUpperCase();
  
  // Common US stocks mapping
  if (clean === 'APPLE') return 'AAPL';
  if (clean === 'TESLA') return 'TSLA';
  if (clean === 'MICROSOFT') return 'MSFT';
  if (clean === 'GOOGLE' || clean === 'ALPHABET') return 'GOOGL';
  if (clean === 'AMAZON') return 'AMZN';
  if (clean === 'META') return 'META';
  if (clean === 'NVIDIA') return 'NVDA';
  
  // Common Indian stocks mapping
  if (clean === 'RELIANCE') return 'RELIANCE.NS';
  if (clean === 'TCS') return 'TCS.NS';
  if (clean === 'HDFC') return 'HDFCBANK.NS';
  if (clean === 'INFOSYS' || clean === 'INFY') return 'INFY.NS';
  if (clean === 'ICICI') return 'ICICIBANK.NS';
  if (clean === 'SBI' || clean === 'SBIN') return 'SBIN.NS';
  if (clean === 'TATAMOTORS') return 'TATAMOTORS.NS';

  return clean; // Fallback to raw symbol
}

export async function POST(req: NextRequest) {
  try {
    await requireUser(req);
    const body = await req.json();
    const assets = body?.assets || [];
    
    // Fetch exchange rate USD -> INR for conversion if needed (fallback 83.5)
    let usdToInr = 83.5;
    try {
      const exRes = await fetch("https://open.er-api.com/v6/latest/USD");
      if (exRes.ok) {
        const exData = await exRes.json();
        if (exData?.rates?.INR) {
          usdToInr = exData.rates.INR;
        }
      }
    } catch (e) {
      console.warn("Failed to fetch exchange rate, using fallback 83.5:", e);
    }

    const updatedAssets = await Promise.all(assets.map(async (asset: any) => {
      const category = asset.category;
      const name = asset.name;
      
      if (category === 'crypto') {
        const binanceSymbol = getBinanceSymbol(name);
        if (binanceSymbol) {
          try {
            const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`);
            if (res.ok) {
              const data = await res.json();
              const priceUsd = parseFloat(data.price);
              if (!isNaN(priceUsd)) {
                // If the user logs in INR or USD, we can check or convert.
                // Let's assume the price returned is converted based on user preference or keeps USD for US assets.
                // We'll return price in USD and INR, or let's default to INR price if currency is INR.
                const priceInr = priceUsd * usdToInr;
                return {
                  ...asset,
                  currentPrice: priceInr, // Default to INR to keep consistency or converted value
                  currentPriceUsd: priceUsd,
                  currentPriceInr: priceInr
                };
              }
            }
          } catch (err) {
            console.error(`Error fetching crypto price for ${name}:`, err);
          }
        }
      } else if (category === 'equity' || category === 'mutual_fund' || category === 'sip') {
        const ticker = getYahooTicker(name);
        try {
          const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`);
          if (res.ok) {
            const data = await res.json();
            const meta = data?.chart?.result?.[0]?.meta;
            const price = meta?.regularMarketPrice;
            const currencyCode = meta?.currency || "USD";
            
            if (price !== undefined) {
              let priceInr = price;
              let priceUsd = price;
              
              if (currencyCode === "USD") {
                priceInr = price * usdToInr;
              } else if (currencyCode === "INR") {
                priceUsd = price / usdToInr;
              }
              
              return {
                ...asset,
                currentPrice: currencyCode === "INR" ? priceInr : priceInr, // Default to INR value
                currentPriceUsd: priceUsd,
                currentPriceInr: priceInr
              };
            }
          }
        } catch (err) {
          console.error(`Error fetching stock price for ${ticker}:`, err);
        }
      }
      
      return asset; // Fallback to original asset if fetch fails
    }));

    return NextResponse.json({ assets: updatedAssets, usdToInr });
  } catch (error) {
    console.error("Error in POST /api/portfolio/prices:", error);
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}
