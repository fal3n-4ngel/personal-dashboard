import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/errors";
import { getPortfolio, updatePortfolio } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const portfolio = await getPortfolio(session);
    return NextResponse.json(portfolio || { assets: [] });
  } catch (error) {
    return toErrorResponse(error, "GET /api/portfolio");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);
    let body: any;
    try {
      body = await req.json();
    } catch {
      throw new ApiError(400, "Invalid JSON body");
    }

    if (!Array.isArray(body?.assets)) {
      throw new ApiError(400, "Expected assets array");
    }

    await updatePortfolio(session, body.assets);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error, "POST /api/portfolio");
  }
}
