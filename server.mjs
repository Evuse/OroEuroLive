import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PORT = Number(process.env.PORT || 5173);
const ROOT = process.cwd();
const cache = new Map();
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8' };

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
    const response = await fetch('https://api.gold-api.com/price/XAU', { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error(`Gold API HTTP ${response.status}`);
    const data = await response.json();
    return { price: assertNumber(data.price, 500, 10_000, 'XAU/USD'), changePercent: Number.isFinite(Number(data.chp)) ? Number(data.chp) : null, timestamp: data.updatedAt || data.timestamp || new Date().toISOString() };
  });
}

async function getEcbFx() {
  return cached('fx', 3_600_000, async () => {
    const response = await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml', { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error(`ECB HTTP ${response.status}`);
    const xml = await response.text();
    const rate = xml.match(/currency=['"]USD['"]\s+rate=['"]([0-9.]+)['"]/i)?.[1];
    const date = xml.match(/time=['"](\d{4}-\d{2}-\d{2})['"]/i)?.[1];
    return { rate: assertNumber(rate, .5, 2, 'EUR/USD'), date };
  });
}

async function getHistory(days) {
  const safeDays = Math.max(7, Math.min(1827, Number(days) || 31));
  return cached(`history-${safeDays}`, 3_600_000, async () => {
    const end = new Date(), start = new Date(Date.now() - safeDays * 86400000);
    const ymd = date => date.toISOString().slice(0,10).replaceAll('-','');
    const url = `https://stooq.com/q/d/l/?s=xauusd&d1=${ymd(start)}&d2=${ymd(end)}&i=d`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000), headers: { 'User-Agent': 'Aurea-Market-Dashboard/1.0' } });
    if (!response.ok) throw new Error(`Stooq HTTP ${response.status}`);
    const rows = (await response.text()).trim().split(/\r?\n/).slice(1).map(line => {
      const [date, open, high, low, close] = line.split(',');
      return { date, open: Number(open), high: Number(high), low: Number(low), close: Number(close) };
    }).filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && Number.isFinite(row.close) && row.close > 500 && row.close < 10_000);
    if (rows.length < 2) throw new Error('Storico insufficiente');
    return rows;
  });
}

async function marketResponse(days) {
  const [spot, fx, history] = await Promise.all([getSpot(), getEcbFx(), getHistory(days)]);
  return { market: { ounceUsd: spot.price, spotChangePercent: spot.changePercent, spotTimestamp: spot.timestamp, eurUsd: fx.rate, fxDate: fx.date, updatedAt: new Date().toISOString() }, history };
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
