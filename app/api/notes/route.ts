import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/errors";
import { getNote, updateNote } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const note = await getNote(session);
    return NextResponse.json(note || { content: "" });
  } catch (error) {
    return toErrorResponse(error, "GET /api/notes");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireUser(req);
    let body: any;
    try { body = await req.json(); } catch { throw new ApiError(400, "Invalid JSON body"); }
    await updateNote(session, body.content || "");
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error, "PUT /api/notes");
  }
}
