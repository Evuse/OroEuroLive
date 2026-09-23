import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';

const fixtureTimes = [1758326400,1758412800,1758499200];
const fixtureQuote = { open:[3650,3670,3690], high:[3680,3700,3720], low:[3640,3660,3680], close:[3670,3690,3710] };

test('aggregates validated market data and serves the dashboard', async t => {
  const upstream = createServer((req,res) => {
    res.setHeader('content-type', req.url === '/ecb' ? 'application/xml' : 'application/json');
    if (req.url === '/gold') return res.end(JSON.stringify({ price:3712.5, updatedAt:'2026-09-23T10:00:00Z' }));
    if (req.url === '/ecb') return res.end("<Cube><Cube time='2026-09-23'><Cube currency='USD' rate='1.1800'/></Cube></Cube>");
    if (req.url.startsWith('/v8/finance/chart/')) return res.end(JSON.stringify({ chart:{ result:[{ meta:{ regularMarketPrice:3710, chartPreviousClose:3690, regularMarketTime:1758499200 }, timestamp:fixtureTimes, indicators:{ quote:[fixtureQuote] } }] } }));
    res.statusCode=404; res.end();
  }).listen(6191);
  t.after(()=>upstream.close());

  const app = spawn(process.execPath,['server.mjs'],{ env:{...process.env,PORT:'6192',GOLD_URL:'http://127.0.0.1:6191/gold',ECB_URL:'http://127.0.0.1:6191/ecb',YAHOO_HOSTS:'http://127.0.0.1:6191'}, stdio:'ignore' });
  t.after(()=>app.kill());
  for(let i=0;i<30;i++){ try{await fetch('http://127.0.0.1:6192/');break;}catch{await new Promise(r=>setTimeout(r,50));} }
  const page = await fetch('http://127.0.0.1:6192/');
  assert.equal(page.status,200); assert.match(await page.text(),/Aurea/);
  const response = await fetch('http://127.0.0.1:6192/api/market?days=31');
  assert.equal(response.status,200);
  const data = await response.json();
  assert.equal(data.market.ounceUsd,3712.5);
  assert.equal(data.market.eurUsd,1.18);
  assert.equal(data.market.spotSource,'Gold API');
  assert.equal(data.history.length,3);
  assert.equal(data.history.at(-1).close,3710);
});
