import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await requireUser(req);
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "adiad.dev@gmail.com";

    if (session.user.email !== adminEmail) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    // 2. Parse payload
    const body = await req.json();
    const triggerType = body?.triggerType; // "subscriptions" | "expenses_weekly" | "expenses_monthly" | "portfolio"

    let cronPath = "";
    if (triggerType === "subscriptions") {
      cronPath = "/api/cron/subscriptions";
    } else if (triggerType === "expenses_weekly") {
      cronPath = "/api/cron/expenses?period=weekly";
    } else if (triggerType === "expenses_monthly") {
      cronPath = "/api/cron/expenses?period=monthly";
    } else if (triggerType === "portfolio") {
      cronPath = "/api/cron/portfolio";
    } else {
      return NextResponse.json({ error: "Invalid trigger type." }, { status: 400 });
    }

    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json({ error: "CRON_SECRET is not configured on the server." }, { status: 500 });
    }

    // 3. Make internal request using the request origin
    const origin = req.nextUrl.origin;
    const cronUrl = `${origin}${cronPath}`;

    const cronRes = await fetch(cronUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });

    const data = await cronRes.json();
    if (!cronRes.ok) {
      return NextResponse.json({ error: data.error || "Cron trigger failed" }, { status: cronRes.status });
    }

    return NextResponse.json({ success: true, response: data });
  } catch (error: any) {
    console.error("Error in admin cron trigger:", error);
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || "Failed to trigger cron" }, { status: 500 });
  }
}
