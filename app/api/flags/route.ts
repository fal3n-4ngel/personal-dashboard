import { NextResponse } from 'next/server';
import { enableInvestmentPortfolios, enableGeminiChatAssitant } from '../../flags';

export async function GET() {
  // In local development, default flags to true to ensure features are accessible
  // unless explicitly overridden in env variables.
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    const envInvest = process.env.ENABLE_INVESTMENT_PORTFOLIOS || process.env.enableInvestmentPortfolios;
    const envChat = process.env.ENABLE_GEMINI_CHAT_ASSITANT || process.env.enableGeminiChatAssitant;
    
    return NextResponse.json({
      enableInvestmentPortfolios: envInvest !== undefined ? envInvest === 'true' : true,
      enableGeminiChatAssitant: envChat !== undefined ? envChat === 'true' : true
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
