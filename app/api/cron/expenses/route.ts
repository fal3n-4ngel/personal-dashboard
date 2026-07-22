import { NextRequest, NextResponse } from "next/server";
import { getCredentials, parseFirebaseConfig } from "@/lib/credentials";
import { refreshIdToken } from "@/lib/auth";
import { listExpenses } from "@/lib/firebase";

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

    // Determine period (weekly or monthly)
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") === "monthly" ? "monthly" : "weekly";
    const daysLimit = period === "monthly" ? 30 : 7;

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

    // 3. Fetch expenses
    const allExpenses = await listExpenses(session);

    // Calculate dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoffDate = new Date();
    cutoffDate.setDate(today.getDate() - daysLimit);
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);

    // Filter expenses in range
    const periodExpenses = allExpenses.filter((e) => e.date && e.date >= cutoffStr && e.amount !== null);

    if (periodExpenses.length === 0) {
      return NextResponse.json({ success: true, message: `No expenses found for the last ${daysLimit} days.` });
    }

    // 4. Calculate statistics
    const totalAmount = periodExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const avgDaily = totalAmount / daysLimit;

    // Category breakdown
    const categoryTotals: Record<string, number> = {};
    periodExpenses.forEach((e) => {
      const cat = e.category || "Uncategorized";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (e.amount || 0);
    });

    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Top 5 expenses
    const topExpenses = [...periodExpenses]
      .sort((a, b) => (b.amount || 0) - (a.amount || 0))
      .slice(0, 5);

    // 5. Craft email HTML template matching UI styling (warm neutral, premium cream)
    const periodTitle = period === "monthly" ? "Monthly Expense Summary" : "Weekly Expense Summary";
    const periodRange = `${cutoffStr} to ${today.toISOString().slice(0, 10)}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${periodTitle}</title>
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
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .logo {
            font-family: Georgia, serif;
            font-size: 20px;
            font-weight: bold;
            letter-spacing: -0.5px;
            color: #1c1b18;
            text-decoration: none;
          }
          .period-badge {
            font-size: 10px;
            font-weight: 700;
            background-color: #1c1b18;
            color: #ffffff;
            padding: 4px 8px;
            border-radius: 20px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .title {
            font-family: Georgia, serif;
            font-size: 22px;
            font-weight: bold;
            color: #1c1b18;
            margin-top: 0;
            margin-bottom: 4px;
            letter-spacing: -0.3px;
          }
          .subtitle {
            font-size: 11px;
            color: #7c7a72;
            margin-bottom: 28px;
          }
          
          /* Hero Stat Card */
          .hero-stat-card {
            background-color: #fcfbfa;
            border: 1px solid #eae8e0;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 28px;
            text-align: center;
          }
          .stat-label {
            font-size: 10px;
            font-weight: 700;
            color: #7c7a72;
            text-transform: uppercase;
            letter-spacing: 0.8px;
          }
          .stat-value {
            font-size: 36px;
            font-weight: bold;
            color: #1c1b18;
            margin-top: 6px;
            margin-bottom: 4px;
            letter-spacing: -1px;
          }
          .stat-daily {
            font-size: 12px;
            color: #7c7a72;
          }

          /* Section Titles */
          .sec-title {
            font-family: Georgia, serif;
            font-size: 15px;
            font-weight: bold;
            color: #1c1b18;
            border-bottom: 1px solid #eae8e0;
            padding-bottom: 8px;
            margin-top: 28px;
            margin-bottom: 16px;
          }

          /* Category Bar Chart */
          .cat-row {
            margin-bottom: 16px;
          }
          .cat-info {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 6px;
          }
          .cat-name {
            color: #1c1b18;
          }
          .cat-amount {
            color: #1c1b18;
          }
          .cat-bar-container {
            height: 6px;
            background-color: #f3f2eb;
            border-radius: 3px;
            overflow: hidden;
          }
          .cat-bar {
            height: 100%;
            background-color: #1c1b18;
            border-radius: 3px;
          }

          /* Table Styling */
          .expense-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            text-align: left;
          }
          .expense-table th {
            font-weight: 700;
            color: #7c7a72;
            border-bottom: 1.5px solid #eae8e0;
            padding-bottom: 8px;
          }
          .expense-table td {
            padding: 12px 0;
            border-bottom: 1px solid #f4f3ec;
            color: #1c1b18;
          }
          .exp-title {
            font-weight: 600;
          }
          .exp-cat {
            color: #7c7a72;
            font-size: 11px;
            margin-top: 2px;
          }
          .exp-amount {
            font-weight: 700;
            text-align: right;
          }
          
          .footer {
            margin-top: 36px;
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
              <td align="right"><span style="font-size: 10px; font-weight: 700; background-color: #1c1b18; color: #ffffff; padding: 4px 8px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">${period}</span></td>
            </tr>
          </table>
          <h1 class="title">${periodTitle}</h1>
          <div class="subtitle">Reporting Period: ${periodRange}</div>
          
          <div class="hero-stat-card">
            <div class="stat-label">Total Outflow</div>
            <div class="stat-value">₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="stat-daily">Average of <strong>₹${avgDaily.toFixed(2)}</strong> per day</div>
          </div>

          <div class="sec-title">Spending by Category</div>
          <div class="categories-container">
            ${categoryBreakdown.map((cat) => `
              <div class="cat-row">
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 6px;">
                  <tr>
                    <td align="left" style="font-size: 12px; font-weight: 600; color: #1c1b18;">
                      ${cat.name} <span style="font-weight:normal; font-size:11px; color:#7c7a72;">(${cat.percentage.toFixed(1)}%)</span>
                    </td>
                    <td align="right" style="font-size: 12px; font-weight: 600; color: #1c1b18;">
                      ₹${cat.amount.toFixed(2)}
                    </td>
                  </tr>
                </table>
                <div class="cat-bar-container">
                  <div class="cat-bar" style="width: ${cat.percentage}%"></div>
                </div>
              </div>
            `).join("")}
          </div>

          <div class="sec-title">Top Outflows</div>
          <table class="expense-table">
            <thead>
              <tr>
                <th>Item / Category</th>
                <th style="text-align: right; width: 80px;">Date</th>
                <th style="text-align: right; width: 100px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${topExpenses.map((exp) => `
                <tr>
                  <td>
                    <div class="exp-title">${exp.title}</div>
                    <div class="exp-cat">${exp.category || "Uncategorized"}</div>
                  </td>
                  <td style="text-align: right; color:#7c7a72;">${exp.date}</td>
                  <td class="exp-amount">₹${(exp.amount || 0).toFixed(2)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="footer">
            <a href="${process.env.APP_URL || "http://localhost:3000"}" class="btn-primary">View Ledger</a>
            <div class="footer-text">This is an automated summary email generated from your Personal Dashboard.</div>
          </div>
        </div>
      </body>
      </html>
    `;

    // 6. Send email via Resend API
    const recipient = process.env.CRON_RECIPIENT_EMAIL || user.email || "adiadithyakrishnan@gmail.com";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.CRON_SENDER_EMAIL || "Personal Dashboard <onboarding@resend.dev>",
        to: [recipient],
        subject: `${periodTitle}: ₹${totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })} spent`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Resend API failed: ${errText}`);
    }

    return NextResponse.json({ success: true, total: totalAmount, period });
  } catch (error: any) {
    console.error("Error in cron/expenses:", error);
    return NextResponse.json({ error: error.message || "Failed to trigger expense summary email" }, { status: 500 });
  }
}
