import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/errors";
import { listWatchlist, addWatchlistItem } from "@/lib/firebase";
import { validateNewWatchlistItem } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);
    let items = await listWatchlist(session);

    const type = req.nextUrl.searchParams.get("type");
    const status = req.nextUrl.searchParams.get("status");
    const limitParam = req.nextUrl.searchParams.get("limit");
    const offsetParam = req.nextUrl.searchParams.get("offset");

    if (type) {
      items = items.filter((i) => i.type.toLowerCase() === type.toLowerCase());
    }
    if (status) {
      items = items.filter((i) => i.status.toLowerCase() === status.toLowerCase());
    }

    const total = items.length;
    const hasPagination = limitParam !== null || offsetParam !== null;

    if (hasPagination) {
      const offset = Math.max(0, parseInt(offsetParam || "0", 10) || 0);
      const limit = Math.max(1, parseInt(limitParam || "50", 10) || 50);
      const paginatedItems = items.slice(offset, offset + limit);
      return NextResponse.json({
        items: paginatedItems,
        total,
        offset,
        limit,
        hasMore: offset + limit < total,
      });
    }

    return NextResponse.json(items);
  } catch (error) {
    return toErrorResponse(error, "GET /api/watchlist");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ApiError(400, "Invalid JSON body");
    }

    const item = validateNewWatchlistItem(body);
    const result = await addWatchlistItem(session, item);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return toErrorResponse(error, "POST /api/watchlist");
  }
}
