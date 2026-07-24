function getBinanceSymbol(name: string): string | null {
  const clean = name.trim().toUpperCase();
  if (['BTC', 'BITCOIN'].includes(clean)) return 'BTCUSDT';
  if (['ETH', 'ETHEREUM'].includes(clean)) return 'ETHUSDT';
  if (['SOL', 'SOLANA'].includes(clean)) return 'SOLUSDT';
  if (['ADA', 'CARDANO'].includes(clean)) return 'ADAUSDT';
  if (['DOGE', 'DOGECOIN'].includes(clean)) return 'DOGEUSDT';
  if (['XRP'].includes(clean)) return 'XRPUSDT';
  if (['BNB'].includes(clean)) return 'BNBUSDT';
  if (clean.length >= 3 && clean.length <= 5) return `${clean}USDT`;
  return null;
}

function getYahooTicker(name: string): string {
  const clean = name.trim().toUpperCase();
  if (clean === 'APPLE') return 'AAPL';
  if (clean === 'TESLA') return 'TSLA';
  if (clean === 'MICROSOFT') return 'MSFT';
  if (clean === 'GOOGLE' || clean === 'ALPHABET') return 'GOOGL';
  if (clean === 'AMAZON') return 'AMZN';
  if (clean === 'META') return 'META';
  if (clean === 'NVIDIA') return 'NVDA';
  if (clean === 'RELIANCE') return 'RELIANCE.NS';
  if (clean === 'TCS') return 'TCS.NS';
  if (clean === 'HDFC') return 'HDFCBANK.NS';
  if (clean === 'INFOSYS' || clean === 'INFY') return 'INFY.NS';
  if (clean === 'ICICI') return 'ICICIBANK.NS';
  if (clean === 'SBI' || clean === 'SBIN') return 'SBIN.NS';
  if (clean === 'TATAMOTORS') return 'TATAMOTORS.NS';
  return clean;
}

export async function fetchAssetPrice(
  category: string,
  name: string,
  usdToInr: number
): Promise<{ priceInr: number; priceUsd: number; previousCloseInr: number | null; previousCloseUsd: number | null } | null> {
  if (category === 'crypto') {
    const binanceSymbol = getBinanceSymbol(name);
    if (binanceSymbol) {
      try {
        // 24hr ticker (not the plain price endpoint) so we get prevClosePrice
        // alongside lastPrice in the same request — crypto trades round the
        // clock, so this rolling 24h window is the closest equivalent to a
        // market's "previous close" for a day-change figure.
        const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`);
        if (res.ok) {
          const data = await res.json();
          const priceUsd = parseFloat(data.lastPrice);
          const prevCloseUsd = parseFloat(data.prevClosePrice);
          if (!isNaN(priceUsd)) {
            return {
              priceInr: priceUsd * usdToInr,
              priceUsd,
              previousCloseInr: !isNaN(prevCloseUsd) ? prevCloseUsd * usdToInr : null,
              previousCloseUsd: !isNaN(prevCloseUsd) ? prevCloseUsd : null,
            };
          }
        }
      } catch (err) {
        console.error(`Error fetching crypto price for ${name}:`, err);
      }
    }
  } else if (category === 'equity' || category === 'mutual_fund' || category === 'sip') {
    const ticker = getYahooTicker(name);
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`);
      if (res.ok) {
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        const price = meta?.regularMarketPrice;
        const prevClose = meta?.chartPreviousClose ?? meta?.previousClose;
        const currencyCode = meta?.currency || "USD";

        if (price !== undefined) {
          let priceInr = price;
          let priceUsd = price;
          let previousCloseInr: number | null = null;
          let previousCloseUsd: number | null = null;

          if (currencyCode === "USD") {
            priceInr = price * usdToInr;
            if (prevClose !== undefined) {
              previousCloseUsd = prevClose;
              previousCloseInr = prevClose * usdToInr;
            }
          } else if (currencyCode === "INR") {
            priceUsd = price / usdToInr;
            if (prevClose !== undefined) {
              previousCloseInr = prevClose;
              previousCloseUsd = prevClose / usdToInr;
            }
          } else if (prevClose !== undefined) {
            previousCloseInr = prevClose;
            previousCloseUsd = prevClose;
          }

          return {
            priceInr,
            priceUsd,
            previousCloseInr,
            previousCloseUsd,
          };
        }
      }
    } catch (err) {
      console.error(`Error fetching stock price for ${ticker}:`, err);
    }
  }
  return null;
}

export async function getUsdToInrRate(): Promise<number> {
  try {
    const exRes = await fetch("https://open.er-api.com/v6/latest/USD");
    if (exRes.ok) {
      const exData = await exRes.json();
      if (exData?.rates?.INR) {
        return exData.rates.INR;
      }
    }
  } catch (e) {
    console.warn("Failed to fetch exchange rate, using fallback 83.5:", e);
  }
  return 83.5;
}
