import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fetchAssetPrice, getUsdToInrRate } from "@/lib/prices";

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
    const usdToInr = await getUsdToInrRate();

    const updatedAssets = await Promise.all(assets.map(async (asset) => {
      const category = asset.category || "";
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

      // Fetch new price using shared utility
      const priceInfo = await fetchAssetPrice(category, name, usdToInr);
      if (priceInfo) {
        priceCache[cacheKey] = {
          priceUsd: priceInfo.priceUsd,
          priceInr: priceInfo.priceInr,
          timestamp: now
        };
        return {
          ...asset,
          currentPrice: priceInfo.priceInr,
          currentPriceUsd: priceInfo.priceUsd,
          currentPriceInr: priceInfo.priceInr,
          isFromCache: false
        };
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
