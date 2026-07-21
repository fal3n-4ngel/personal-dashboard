import { NextResponse } from 'next/server';
import { enableInvestmentPortfolios } from '../../flags';

export async function GET() {
  const isEnabled = await enableInvestmentPortfolios();
  return NextResponse.json({
    enableInvestmentPortfolios: isEnabled
  });
}
