import { NextRequest, NextResponse } from "next/server";
import { getCredentials, parseFirebaseConfig } from "@/lib/credentials";
import { refreshIdToken } from "@/lib/auth";
import { getPortfolio } from "@/lib/firebase";
import { fetchAssetPrice, getUsdToInrRate } from "@/lib/prices";

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

    // 3. Fetch portfolio
    const portfolio = await getPortfolio(session);
    if (!portfolio || !portfolio.assets || portfolio.assets.length === 0) {
      return NextResponse.json({ success: true, message: "Portfolio is empty. No email sent." });
    }

    // 4. Fetch exchange rate and update prices of assets
    const usdToInr = await getUsdToInrRate();
    
    let totalInvested = 0;
    let totalCurrent = 0;

    const enrichedAssets = await Promise.all(
      portfolio.assets.map(async (asset) => {
        const category = asset.category || "equity";
        const name = asset.name || "";
        
        let currentPrice = asset.currentPrice || asset.buyPrice || 0;
        let isLive = false;

        // Try to fetch live price
        const priceInfo = await fetchAssetPrice(category, name, usdToInr);
        if (priceInfo) {
          currentPrice = priceInfo.priceInr;
          isLive = true;
        }

        const quantity = asset.quantity !== undefined ? asset.quantity : 1;
        const investedAmount = asset.investedAmount !== undefined ? asset.investedAmount : asset.amount;
        
        // Calculate current value
        let currentValue = asset.amount;
        if (asset.quantity !== undefined && currentPrice > 0) {
          currentValue = quantity * currentPrice;
        } else if (isLive) {
          currentValue = currentPrice;
        }

        totalInvested += investedAmount;
        totalCurrent += currentValue;

        const pnl = currentValue - investedAmount;
        const pnlPercent = investedAmount > 0 ? (pnl / investedAmount) * 100 : 0;

        return {
          ...asset,
          quantity,
          currentPrice,
          investedAmount,
          currentValue,
          pnl,
          pnlPercent,
          isLive,
        };
      })
    );

    const overallPnl = totalCurrent - totalInvested;
    const overallPnlPercent = totalInvested > 0 ? (overallPnl / totalInvested) * 100 : 0;

    const isGreen = overallPnl >= 0;
    const pnlColor = isGreen ? "#166534" : "#991b1b";
    const pnlBg = isGreen ? "#f0fdf4" : "#fef2f2";

    // 5. Craft email HTML template matching UI styling (warm neutral, premium cream)
    const todayStr = new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Daily Portfolio Close</title>
        <style>
          body {
            background-color: #f4f3ec;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1c1b18;
            margin: 0;
            padding: 40px 20px;
          }
          .container {
            max-width: 600px;
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
          .date-badge {
            font-size: 11px;
            color: #7c7a72;
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
            font-size: 12px;
            color: #7c7a72;
            margin-bottom: 28px;
          }
          
          /* Hero P&L Panel */
          .pnl-panel {
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 28px;
            text-align: center;
            border: 1px solid #eae8e0;
          }
          .stat-label {
            font-size: 10px;
            font-weight: 700;
            color: #7c7a72;
            text-transform: uppercase;
            letter-spacing: 0.8px;
          }
          .valuation {
            font-size: 34px;
            font-weight: bold;
            color: #1c1b18;
            margin-top: 6px;
            margin-bottom: 8px;
            letter-spacing: -1px;
          }
          .pnl-badge {
            display: inline-block;
            font-size: 13px;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 20px;
            margin-top: 4px;
          }
          
          /* Mini Grid Stats */
          .mini-grid {
            display: flex;
            gap: 16px;
            margin-bottom: 28px;
          }
          .mini-card {
            flex: 1;
            background-color: #fcfbfa;
            border: 1px solid #eae8e0;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
          }
          .mini-val {
            font-size: 18px;
            font-weight: 700;
            color: #1c1b18;
            margin-top: 4px;
          }

          /* Asset Table */
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
          .asset-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            text-align: left;
          }
          .asset-table th {
            font-weight: 700;
            color: #7c7a72;
            border-bottom: 1.5px solid #eae8e0;
            padding-bottom: 8px;
          }
          .asset-table td {
            padding: 12px 0;
            border-bottom: 1px solid #f4f3ec;
            color: #1c1b18;
            vertical-align: middle;
          }
          .asset-name {
            font-weight: 600;
            font-size: 12px;
          }
          .asset-cat {
            color: #7c7a72;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 2px;
          }
          .txt-right {
            text-align: right;
          }
          .pnl-green {
            color: #166534;
            font-weight: 600;
          }
          .pnl-red {
            color: #991b1b;
            font-weight: 600;
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
              <td align="right"><span style="font-size: 11px; color: #7c7a72;">${todayStr}</span></td>
            </tr>
          </table>
          <h1 class="title">Daily Portfolio Close</h1>
          <div class="subtitle">Indian Market Close Wrap-Up (5:30 PM IST)</div>
          
          <div class="pnl-panel" style="background-color: ${pnlBg}; border-color: ${isGreen ? "#bbf7d0" : "#fecaca"};">
            <div class="stat-label">Net Asset Valuation</div>
            <div class="valuation">₹${totalCurrent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="pnl-badge" style="color: ${pnlColor};">
              ${isGreen ? "▲" : "▼"} ₹${Math.abs(overallPnl).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${overallPnlPercent.toFixed(2)}%)
            </div>
          </div>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
            <tr>
              <td width="48%" style="background-color: #fcfbfa; border: 1px solid #eae8e0; border-radius: 8px; padding: 16px; text-align: center;">
                <div class="stat-label" style="font-size: 10px; font-weight: 700; color: #7c7a72; text-transform: uppercase; letter-spacing: 0.8px;">Invested Capital</div>
                <div class="mini-val" style="font-size: 18px; font-weight: 700; color: #1c1b18; margin-top: 4px;">₹${totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              </td>
              <td width="4%"></td>
              <td width="48%" style="background-color: #fcfbfa; border: 1px solid #eae8e0; border-radius: 8px; padding: 16px; text-align: center;">
                <div class="stat-label" style="font-size: 10px; font-weight: 700; color: #7c7a72; text-transform: uppercase; letter-spacing: 0.8px;">USD to INR Rate</div>
                <div class="mini-val" style="font-size: 18px; font-weight: 700; color: #1c1b18; margin-top: 4px;">₹${usdToInr.toFixed(2)}</div>
              </td>
            </tr>
          </table>

          <div class="sec-title">Asset Breakdown</div>
          <table class="asset-table">
            <thead>
              <tr>
                <th>Asset / Class</th>
                <th class="txt-right">Qty</th>
                <th class="txt-right">CMP</th>
                <th class="txt-right">Current Value</th>
                <th class="txt-right">Net P&L</th>
              </tr>
            </thead>
            <tbody>
              ${enrichedAssets.map((asset) => {
                const assetPnlClass = asset.pnl >= 0 ? "pnl-green" : "pnl-red";
                return `
                  <tr>
                    <td>
                      <div class="asset-name">${asset.name}</div>
                      <div class="asset-cat">${asset.category}</div>
                    </td>
                    <td class="txt-right font-mono" style="color: #7c7a72;">${asset.quantity.toLocaleString('en-IN')}</td>
                    <td class="txt-right font-mono">₹${asset.currentPrice.toFixed(2)}</td>
                    <td class="txt-right font-mono" style="font-weight:600;">₹${asset.currentValue.toFixed(2)}</td>
                    <td class="txt-right font-mono ${assetPnlClass}">
                      ${asset.pnl >= 0 ? "+" : ""}₹${asset.pnl.toFixed(0)}
                      <div style="font-size: 9px; font-weight: normal; margin-top: 1px;">
                        (${asset.pnlPercent.toFixed(1)}%)
                      </div>
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>

          <div class="footer">
            <a href="${process.env.APP_URL || "http://localhost:3000"}" class="btn-primary">View Portfolio</a>
            <div class="footer-text">This is an automated wrap-up email generated from your Personal Dashboard.</div>
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
        subject: `Daily Portfolio Close: ₹${totalCurrent.toLocaleString('en-IN', { maximumFractionDigits: 0 })} (${overallPnlPercent >= 0 ? "+" : ""}${overallPnlPercent.toFixed(1)}%)`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Resend API failed: ${errText}`);
    }

    return NextResponse.json({ success: true, valuation: totalCurrent, pnl: overallPnl });
  } catch (error: any) {
    console.error("Error in cron/portfolio:", error);
    return NextResponse.json({ error: error.message || "Failed to trigger portfolio close email" }, { status: 500 });
  }
}
