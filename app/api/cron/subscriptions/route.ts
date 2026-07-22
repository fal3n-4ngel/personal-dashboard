import { NextRequest, NextResponse } from "next/server";
import { getCredentials, parseFirebaseConfig } from "@/lib/credentials";
import { refreshIdToken } from "@/lib/auth";
import { listSubscriptions } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. Verify cron secret key
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const refreshToken = process.env.CRON_REFRESH_TOKEN;
    if (!resendApiKey) {
      return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
    }
    if (!refreshToken) {
      return NextResponse.json({ error: "Missing CRON_REFRESH_TOKEN" }, { status: 500 });
    }

    // 2. Exchange refresh token for fresh session
    const creds = await getCredentials(req);
    const config = parseFirebaseConfig(creds);
    const { idToken, user } = await refreshIdToken(config, refreshToken);

    const session = {
      creds,
      config,
      uid: user.uid,
      idToken,
      user,
    };

    // 3. Fetch subscriptions
    const subscriptions = await listSubscriptions(session);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingRenewals = subscriptions.filter((sub) => {
      if (!sub.nextBillingDate) return false;
      const billingDate = new Date(sub.nextBillingDate + "T00:00:00");
      const diffTime = billingDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays === 2 || diffDays === 3;
    });

    if (upcomingRenewals.length === 0) {
      return NextResponse.json({ success: true, message: "No upcoming subscription renewals found." });
    }

    // 4. Craft email HTML template matching UI styling (warm neutral, premium cream)
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Upcoming Renewals</title>
        <style>
          body {
            background-color: #f4f3ec;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1c1b18;
            margin: 0;
            padding: 40px 20px;
          }
          .container {
            max-width: 560px;
            background-color: #ffffff;
            border: 1px solid #eae8e0;
            border-radius: 12px;
            margin: 0 auto;
            padding: 32px;
            box-shadow: 0 4px 20px rgba(28, 27, 24, 0.03);
          }
          .header {
            border-bottom: 1px solid #eae8e0;
            padding-bottom: 20px;
            margin-bottom: 24px;
          }
          .logo {
            font-family: Georgia, serif;
            font-size: 20px;
            font-weight: bold;
            letter-spacing: -0.5px;
            color: #1c1b18;
            text-decoration: none;
          }
          .title {
            font-family: Georgia, serif;
            font-size: 22px;
            font-weight: bold;
            color: #1c1b18;
            margin-top: 24px;
            margin-bottom: 8px;
            letter-spacing: -0.3px;
          }
          .subtitle {
            font-size: 13px;
            color: #7c7a72;
            margin-bottom: 24px;
            line-height: 1.5;
          }
          .sub-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px;
            background-color: #fcfbfa;
            border: 1px solid #eae8e0;
            border-radius: 8px;
            margin-bottom: 12px;
          }
          .sub-info {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .sub-icon {
            font-size: 20px;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #eae8e0;
            border-radius: 6px;
          }
          .sub-name {
            font-size: 14px;
            font-weight: 600;
            color: #1c1b18;
          }
          .sub-days {
            font-size: 11px;
            color: #b45309;
            background-color: #fef3c7;
            padding: 2px 6px;
            border-radius: 4px;
            margin-top: 4px;
            width: fit-content;
          }
          .sub-cost {
            font-size: 15px;
            font-weight: 700;
            color: #1c1b18;
            text-align: right;
          }
          .sub-date {
            font-size: 11px;
            color: #7c7a72;
            margin-top: 4px;
          }
          .footer {
            margin-top: 32px;
            border-top: 1px solid #eae8e0;
            padding-top: 24px;
            text-align: center;
          }
          .btn-primary {
            display: inline-block;
            background-color: #1c1b18;
            color: #ffffff !important;
            font-size: 13px;
            font-weight: 600;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 6px;
            margin-bottom: 16px;
          }
          .footer-text {
            font-size: 11px;
            color: #7c7a72;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom: 1px solid #eae8e0; padding-bottom: 20px; margin-bottom: 24px;">
            <tr>
              <td align="left"><span style="font-family: Georgia, serif; font-size: 20px; font-weight: bold; letter-spacing: -0.5px; color: #1c1b18;">PHub Dashboard</span></td>
              <td align="right"><span style="font-size: 10px; font-weight: 700; background-color: #b45309; color: #ffffff; padding: 4px 8px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">Alert</span></td>
            </tr>
          </table>
          <h1 class="title">Upcoming Subscription Renewals</h1>
          <p class="subtitle">Heads up! The following subscriptions are renewing in the next 2-3 days. Please review them below.</p>
          
          <div class="sub-list">
            ${upcomingRenewals.map((sub) => {
              const billingDate = new Date(sub.nextBillingDate + "T00:00:00");
              const diffTime = billingDate.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              return `
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fcfbfa; border: 1px solid #eae8e0; border-radius: 8px; margin-bottom: 12px; padding: 16px;">
                  <tr>
                    <td align="left" style="vertical-align: middle;">
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="font-size: 20px; width: 32px; height: 32px; background-color: #eae8e0; border-radius: 6px; text-align: center; vertical-align: middle;">
                            ${sub.icon || "💳"}
                          </td>
                          <td style="vertical-align: middle; padding-left: 12px;">
                            <div style="font-size: 14px; font-weight: 600; color: #1c1b18; line-height: 1.2;">${sub.name}</div>
                            <div style="font-size: 11px; color: #b45309; background-color: #fef3c7; padding: 2px 6px; border-radius: 4px; margin-top: 4px; display: inline-block;">Renewing in ${diffDays} days</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td align="right" style="vertical-align: middle;">
                      <div style="font-size: 15px; font-weight: 700; color: #1c1b18; text-align: right;">₹${sub.cost.toFixed(2)}</div>
                      <div style="font-size: 11px; color: #7c7a72; margin-top: 4px; text-align: right;">${sub.billingCycle === "yearly" ? "Yearly" : "Monthly"} • ${sub.nextBillingDate}</div>
                    </td>
                  </tr>
                </table>
              `;
            }).join("")}
          </div>

          <div class="footer">
            <a href="${process.env.APP_URL || "http://localhost:3000"}" class="btn-primary">Manage Subscriptions</a>
            <div class="footer-text">This is an automated security alert from your Personal Dashboard.</div>
          </div>
        </div>
      </body>
      </html>
    `;

    // 5. Send email via Resend API
    const recipient = process.env.CRON_RECIPIENT_EMAIL || user.email || "adiadithyakrishnan@gmail.com"; // Fallback to safe email if none
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.CRON_SENDER_EMAIL || "Personal Dashboard <onboarding@resend.dev>",
        to: [recipient],
        subject: `Alert: ${upcomingRenewals.length} Upcoming Subscription Renewals`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Resend API failed: ${errText}`);
    }

    return NextResponse.json({ success: true, emailed: upcomingRenewals.length });
  } catch (error: any) {
    console.error("Error in cron/subscriptions:", error);
    return NextResponse.json({ error: error.message || "Failed to trigger subscription alerts" }, { status: 500 });
  }
}
