import { NextResponse } from 'next/server';
import https from 'https';

export const dynamic = 'force-dynamic';

function fetchJsonNative(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, {
      rejectUnauthorized: false,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`Server responded with status ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');
  if (!ticker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
  }

  try {
    const data = await fetchJsonNative(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`);
    const quote = data?.chart?.result?.[0]?.meta;
    if (!quote) {
      return NextResponse.json({ error: 'No data found for ticker' }, { status: 404 });
    }

    const price = quote.regularMarketPrice;
    const previousClose = quote.previousClose ?? quote.chartPreviousClose ?? price;
    const change = price - previousClose;
    const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

    return NextResponse.json({
      price: price,
      change: change,
      changePercent: changePercent,
      volume: quote.regularMarketVolume ?? null,
      high52: quote.fiftyTwoWeekHigh ?? null,
      low52: quote.fiftyTwoWeekLow ?? null,
      currency: quote.currency || 'USD',
      exchange: quote.fullExchangeName || quote.exchangeName || 'N/A',
      displayName: quote.longName || quote.shortName || quote.symbol || ticker,
    });
  } catch (err: any) {
    console.error('Failed to fetch market data:', err);
    return NextResponse.json({ error: `Failed to fetch market data: ${err.message}` }, { status: 500 });
  }
}
