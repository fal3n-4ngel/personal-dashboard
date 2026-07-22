import { NextResponse } from 'next/server';
import { enableInvestmentPortfolios, enableGeminiChatAssitant } from '../../flags';

export async function GET() {
  // Safe shortcut: in local development without Vercel configuration/secrets,
  // return fallback directly to avoid spamming console logs with Vercel Flags SDK connection warnings.
  const hasVercelConfig = !!(process.env.FLAGS_SECRET || process.env.VERCEL || process.env.EDGE_CONFIG);
  
  if (!hasVercelConfig) {
    const envInvest = process.env.ENABLE_INVESTMENT_PORTFOLIOS || process.env.enableInvestmentPortfolios;
    const envChat = process.env.ENABLE_GEMINI_CHAT_ASSITANT || process.env.enableGeminiChatAssitant;
    return NextResponse.json({
      enableInvestmentPortfolios: envInvest !== 'false',
      enableGeminiChatAssitant: envChat !== 'false'
    });
  }

  try {
    const isInvestEnabled = await enableInvestmentPortfolios();
    const isChatEnabled = await enableGeminiChatAssitant();
    return NextResponse.json({
      enableInvestmentPortfolios: isInvestEnabled,
      enableGeminiChatAssitant: isChatEnabled
    });
  } catch (err) {
    const envInvest = process.env.ENABLE_INVESTMENT_PORTFOLIOS || process.env.enableInvestmentPortfolios;
    const envChat = process.env.ENABLE_GEMINI_CHAT_ASSITANT || process.env.enableGeminiChatAssitant;
    return NextResponse.json({
      enableInvestmentPortfolios: envInvest !== 'false',
      enableGeminiChatAssitant: envChat !== 'false'
    });
  }
}
