import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface YahooQuote {
  symbol?: string;
  shortname?: string;
  longname?: string;
  exchange?: string;
  quoteType?: string;
}

export async function GET(req: NextRequest) {
  try {
    await requireUser(req);
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    
    if (!query.trim()) {
      return NextResponse.json({ quotes: [] });
    }

    // Call Yahoo Finance search autocomplete API
    const res = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&newsCount=0`);
    
    if (res.ok) {
      const data = await res.json();
      const rawQuotes = (data?.quotes || []) as YahooQuote[];
      const quotes = rawQuotes.map((q) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchange,
        type: q.quoteType, // e.g. EQUITY, CRYPTOCURRENCY, MUTUALFUND
      }));
      return NextResponse.json({ quotes });
    }
    
    return NextResponse.json({ quotes: [] });
  } catch (error) {
    console.error("Error in GET /api/portfolio/search:", error);
    return NextResponse.json({ error: "Failed to search symbols" }, { status: 500 });
  }
}
