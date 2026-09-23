import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PORT = Number(process.env.PORT || 5173);
const ROOT = process.cwd();
const cache = new Map();
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8' };
const GOLD_URL = process.env.GOLD_URL || 'https://api.gold-api.com/price/XAU';
const ECB_URL = process.env.ECB_URL || 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
const YAHOO_HOSTS = (process.env.YAHOO_HOSTS || 'https://query1.finance.yahoo.com,https://query2.finance.yahoo.com').split(',');

function assertNumber(value, min, max, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) throw new Error(`${label} non valido`);
  return number;
}

async function cached(key, ttl, loader) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.time < ttl) return hit.value;
  const value = await loader(); cache.set(key, { time: Date.now(), value }); return value;
}

async function getSpot() {
  return cached('spot', 55_000, async () => {
    try {
      const response = await fetch(GOLD_URL, { signal: AbortSignal.timeout(8_000) });
      if (!response.ok) throw new Error(`Gold API HTTP ${response.status}`);
      const data = await response.json();
      return { price: assertNumber(data.price, 500, 10_000, 'XAU/USD'), changePercent: Number.isFinite(Number(data.chp)) ? Number(data.chp) : null, timestamp: data.updatedAt || data.timestamp || new Date().toISOString(), source: 'Gold API', sourceUrl: 'https://gold-api.com/' };
    } catch (error) {
      console.warn(`Spot primario non disponibile (${error.message}), uso Yahoo Finance.`);
      const yahoo = await getYahooChart(7);
      return { price: yahoo.price, changePercent: yahoo.changePercent, timestamp: yahoo.timestamp, source: yahoo.name, sourceUrl: yahoo.url };
    }
  });
}

async function getEcbFx() {
  return cached('fx', 3_600_000, async () => {
    try {
      const response = await fetch(ECB_URL, { signal: AbortSignal.timeout(8_000) });
      if (!response.ok) throw new Error(`ECB HTTP ${response.status}`);
      const xml = await response.text();
      const rate = xml.match(/currency=['"]USD['"]\s+rate=['"]([0-9.]+)['"]/i)?.[1];
      const date = xml.match(/time=['"](\d{4}-\d{2}-\d{2})['"]/i)?.[1];
      return { rate: assertNumber(rate, .5, 2, 'EUR/USD'), date, source: 'Banca Centrale Europea', sourceUrl: 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html' };
    } catch (error) {
      console.warn(`Cambio ECB non disponibile (${error.message}), uso Yahoo Finance.`);
      const yahoo = await fetchYahoo('EURUSD=X', 7);
      return { rate: assertNumber(yahoo.meta.regularMarketPrice, .5, 2, 'EUR/USD'), date: new Date((yahoo.meta.regularMarketTime || Date.now()/1000)*1000).toISOString().slice(0,10), source: 'Yahoo Finance', sourceUrl: 'https://finance.yahoo.com/quote/EURUSD=X/' };
    }
  });
}

async function fetchYahoo(symbol, days) {
  const end = Math.floor(Date.now() / 1000), start = end - Math.max(7, days) * 86400;
  const query = `${encodeURIComponent(symbol)}?period1=${start}&period2=${end}&interval=1d&events=history`;
  let lastError;
  for (const host of YAHOO_HOSTS) {
    try {
      const response = await fetch(`${host}/v8/finance/chart/${query}`, { signal: AbortSignal.timeout(10_000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AureaMarkets/1.0)', 'Accept': 'application/json' } });
      if (!response.ok) throw new Error(`Yahoo HTTP ${response.status}`);
      const result = (await response.json()).chart?.result?.[0];
      if (!result?.timestamp?.length) throw new Error('Yahoo non ha restituito quotazioni');
      return { meta: result.meta, timestamps: result.timestamp, quote: result.indicators?.quote?.[0] || {} };
    } catch (error) { lastError = error; }
  }
  throw lastError;
}

async function getYahooChart(days) {
  const safeDays = Math.max(7, Math.min(1827, Number(days) || 31));
  return cached(`yahoo-${safeDays}`, 900_000, async () => {
    let data, symbol = 'XAUUSD=X', name = 'Yahoo Finance · XAU/USD spot';
    try { data = await fetchYahoo(symbol, safeDays); }
    catch { symbol = 'GC=F'; name = 'Yahoo Finance · COMEX Gold'; data = await fetchYahoo(symbol, safeDays); }
    const rows = data.timestamps.map((time, index) => ({ date: new Date(time*1000).toISOString().slice(0,10), open: Number(data.quote.open?.[index]), high: Number(data.quote.high?.[index]), low: Number(data.quote.low?.[index]), close: Number(data.quote.close?.[index]) })).filter(row => Number.isFinite(row.close) && row.close > 500 && row.close < 10_000);
    if (rows.length < 2) throw new Error('Storico insufficiente');
    const price = assertNumber(data.meta.regularMarketPrice || rows.at(-1).close, 500, 10_000, 'Oro USD/oncia');
    const previous = Number(data.meta.chartPreviousClose || rows.at(-2).close);
    return { rows, price, changePercent: Number.isFinite(previous) ? (price/previous-1)*100 : null, timestamp: new Date((data.meta.regularMarketTime || data.timestamps.at(-1))*1000).toISOString(), name, url: `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/` };
  });
}

async function marketResponse(days) {
  const [spot, fx, chart] = await Promise.all([getSpot(), getEcbFx(), getYahooChart(days)]);
  return { market: { ounceUsd: spot.price, spotChangePercent: spot.changePercent, spotTimestamp: spot.timestamp, spotSource: spot.source, spotSourceUrl: spot.sourceUrl, eurUsd: fx.rate, fxDate: fx.date, fxSource: fx.source, fxSourceUrl: fx.sourceUrl, historySource: chart.name, historySourceUrl: chart.url, updatedAt: new Date().toISOString() }, history: chart.rows };
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === '/api/market') {
      const data = await marketResponse(url.searchParams.get('days'));
      response.writeHead(200, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' });
      return response.end(JSON.stringify(data));
    }
    const path = url.pathname === '/' ? 'index.html' : normalize(url.pathname).replace(/^(\.\.(\/|\\|$))+/, '').replace(/^\//,'');
    if (!['index.html','assets/main.js','assets/style.css'].includes(path)) { response.writeHead(404); return response.end('Not found'); }
    const content = await readFile(join(ROOT, path));
    response.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' }); response.end(content);
  } catch (error) {
    console.error(error.message);
    response.writeHead(502, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' });
    response.end(JSON.stringify({ error: 'Una fonte di mercato non è disponibile. Nessun dato stimato è stato restituito.' }));
  }
});

server.listen(PORT, () => console.log(`Aurea disponibile su http://localhost:${PORT}`));
