import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// In-memory price cache
interface CacheEntry {
  priceUsd: number;
  priceInr: number;
  timestamp: number;
}
const priceCache: Record<string, CacheEntry> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL

// In-memory user cooldown tracker
const lastUserRefresh: Record<string, number> = {};
const REFRESH_COOLDOWN = 30 * 1000; // 30 seconds cooldown limit

function getBinanceSymbol(name: string): string | null {
  const clean = name.trim().toUpperCase();
  if (['BTC', 'BITCOIN'].includes(clean)) return 'BTCUSDT';
  if (['ETH', 'ETHEREUM'].includes(clean)) return 'ETHUSDT';
  if (['SOL', 'SOLANA'].includes(clean)) return 'SOLUSDT';
  if (['ADA', 'CARDANO'].includes(clean)) return 'ADAUSDT';
  if (['DOGE', 'DOGECOIN'].includes(clean)) return 'DOGEUSDT';
  if (['XRP'].includes(clean)) return 'XRPUSDT';
  if (['BNB'].includes(clean)) return 'BNBUSDT';
  if (clean.length >= 3 && clean.length <= 5) return `${clean}USDT`;
  return null;
}

function getYahooTicker(name: string): string {
  const clean = name.trim().toUpperCase();
  if (clean === 'APPLE') return 'AAPL';
  if (clean === 'TESLA') return 'TSLA';
  if (clean === 'MICROSOFT') return 'MSFT';
  if (clean === 'GOOGLE' || clean === 'ALPHABET') return 'GOOGL';
  if (clean === 'AMAZON') return 'AMZN';
  if (clean === 'META') return 'META';
  if (clean === 'NVIDIA') return 'NVDA';
  if (clean === 'RELIANCE') return 'RELIANCE.NS';
  if (clean === 'TCS') return 'TCS.NS';
  if (clean === 'HDFC') return 'HDFCBANK.NS';
  if (clean === 'INFOSYS' || clean === 'INFY') return 'INFY.NS';
  if (clean === 'ICICI') return 'ICICIBANK.NS';
  if (clean === 'SBI' || clean === 'SBIN') return 'SBIN.NS';
  if (clean === 'TATAMOTORS') return 'TATAMOTORS.NS';
  return clean;
}

interface AssetPriceInput {
  category?: string;
  name?: string;
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const body = await req.json();
    const assets: AssetPriceInput[] = body?.assets || [];
    const forceRefresh = !!body?.forceRefresh;
    
    const uid = session.uid;
    const now = Date.now();
    
    let isCooldownActive = false;
    let secondsLeft = 0;
    
    // Check cooldown for force refresh
    if (forceRefresh && lastUserRefresh[uid]) {
      const timePassed = now - lastUserRefresh[uid];
      if (timePassed < REFRESH_COOLDOWN) {
        isCooldownActive = true;
        secondsLeft = Math.ceil((REFRESH_COOLDOWN - timePassed) / 1000);
      }
    }

    // Update refresh timestamp if we are actually fetching fresh data
    if (forceRefresh && !isCooldownActive) {
      lastUserRefresh[uid] = now;
    }

    // Fetch exchange rate USD -> INR
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

    const updatedAssets = await Promise.all(assets.map(async (asset) => {
      const category = asset.category;
      const name = asset.name || "";
      const cacheKey = `${category}:${name}`;
      
      // Return cached price if valid and we're not doing a valid forceRefresh
      if (!forceRefresh || isCooldownActive) {
        const cached = priceCache[cacheKey];
        if (cached && (now - cached.timestamp < CACHE_TTL)) {
          return {
            ...asset,
            currentPrice: cached.priceInr,
            currentPriceUsd: cached.priceUsd,
            currentPriceInr: cached.priceInr,
            isFromCache: true
          };
        }
      }

      // Fetch new price
      if (category === 'crypto') {
        const binanceSymbol = getBinanceSymbol(name);
        if (binanceSymbol) {
          try {
            const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`);
            if (res.ok) {
              const data = await res.json();
              const priceUsd = parseFloat(data.price);
              if (!isNaN(priceUsd)) {
                const priceInr = priceUsd * usdToInr;
                priceCache[cacheKey] = { priceUsd, priceInr, timestamp: now };
                return {
                  ...asset,
                  currentPrice: priceInr,
                  currentPriceUsd: priceUsd,
                  currentPriceInr: priceInr,
                  isFromCache: false
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
              
              priceCache[cacheKey] = { priceUsd, priceInr, timestamp: now };
              return {
                ...asset,
                currentPrice: priceInr,
                currentPriceUsd: priceUsd,
                currentPriceInr: priceInr,
                isFromCache: false
              };
            }
          }
        } catch (err) {
          console.error(`Error fetching stock price for ${ticker}:`, err);
        }
      }
      
      // Fallback if APIs fail or not supported, check if old cache exists first
      const cached = priceCache[cacheKey];
      if (cached) {
        return {
          ...asset,
          currentPrice: cached.priceInr,
          currentPriceUsd: cached.priceUsd,
          currentPriceInr: cached.priceInr,
          isFromCache: true
        };
      }
      
      return asset;
    }));

    return NextResponse.json({ 
      assets: updatedAssets, 
      usdToInr,
      cooldownActive: isCooldownActive,
      cooldownSecondsLeft: secondsLeft 
    });
  } catch (error) {
    console.error("Error in POST /api/portfolio/prices:", error);
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}
