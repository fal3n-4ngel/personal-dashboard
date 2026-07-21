import { flag } from 'flags/next';

export const enableInvestmentPortfolios = flag({
  key: 'enableInvestmentPortfolios',
  decide: () => {
    const envVal = process.env.ENABLE_INVESTMENT_PORTFOLIOS || process.env.enableInvestmentPortfolios;
    if (envVal === 'false') return false;
    return true;
  },
  description: 'Enable the Investment Portfolios feature',
});
