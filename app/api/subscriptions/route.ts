import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/errors";
import { listSubscriptions, createSubscription } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const subscriptions = await listSubscriptions(session);
    return NextResponse.json(subscriptions);
  } catch (error) {
    return toErrorResponse(error, "GET /api/subscriptions");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);
    let body: any;
    try { body = await req.json(); } catch { throw new ApiError(400, "Invalid JSON body"); }
    const result = await createSubscription(session, body);
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error, "POST /api/subscriptions");
  }
}
