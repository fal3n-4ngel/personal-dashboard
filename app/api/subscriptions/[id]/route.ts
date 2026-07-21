import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/errors";
import { deleteSubscription } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireUser(req);
    await deleteSubscription(session, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error, "DELETE /api/subscriptions/[id]");
  }
}
