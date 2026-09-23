const OUNCE_IN_GRAMS = 31.1034768;
const state = { currency: 'EUR', purity: 18, range: '1M', ounceUsd: 3706.42, eurUsd: 1.1742, connected: false };
const ranges = { '1G': 48, '1S': 70, '1M': 92, '6M': 120, '1A': 160, MAX: 210 };

document.querySelector('#app').innerHTML = `
  <header class="topbar">
    <a class="brand" href="#" aria-label="Aurea home"><span class="brand-mark">A</span><span>AUREA</span></a>
    <nav><a class="active" href="#mercati">Mercati</a><a href="#metodo">Come funziona</a><a href="#fonti">Fonti</a></nav>
    <div class="top-actions"><span class="market-pill" id="market-status"><i></i> Connessione dati…</span><button class="icon-button" aria-label="Impostazioni">•••</button></div>
  </header>
  <main>
    <section class="hero" id="mercati">
      <div>
        <div class="eyebrow"><span>METALLI PREZIOSI</span><span class="slash">/</span><span id="crumb">ORO 18K</span></div>
        <h1>Il valore dell'oro.<br><em>Senza rumore.</em></h1>
      </div>
      <p class="intro">Quotazioni chiare, fonti trasparenti.<br>Aggiornate mentre il mercato si muove.</p>
    </section>

    <section class="terminal">
      <div class="terminal-head">
        <div class="asset-id"><div class="coin">Au</div><div><h2 id="asset-name">Oro 18 carati</h2><p>Prezzo indicativo per grammo</p></div></div>
        <div class="selectors">
          <label><span>PUREZZA</span><select id="purity"><option value="18">18 carati · 750‰</option><option value="24">24 carati · 999,9‰</option></select></label>
          <label><span>VALUTA</span><select id="currency"><option>EUR</option><option>USD</option></select></label>
        </div>
      </div>
      <div class="terminal-grid">
        <aside class="quote-panel">
          <p class="quote-label">QUOTAZIONE ATTUALE</p>
          <div class="quote"><span id="currency-symbol">€</span><strong id="price">89,31</strong></div>
          <div class="delta"><span>↗</span> <b id="delta">+0,84%</b><small>oggi</small></div>
          <div class="quote-meta"><div><span>AGGIORNATO</span><b id="updated">ora</b></div><div><span>UNITÀ</span><b>1 grammo</b></div></div>
          <button class="alert-button"><span>＋</span> Crea avviso di prezzo</button>
        </aside>
        <div class="chart-panel">
          <div class="chart-tools"><div id="range-buttons">${Object.keys(ranges).map((r) => `<button class="${r === '1M' ? 'active' : ''}" data-range="${r}">${r}</button>`).join('')}</div><button class="expand" aria-label="Espandi grafico">↗</button></div>
          <div class="chart-wrap"><svg id="chart" viewBox="0 0 900 350" preserveAspectRatio="none" aria-label="Grafico quotazione oro"></svg><div id="tooltip" class="tooltip"></div></div>
          <div class="chart-stats"><div><span>APERTURA</span><b id="open">88,56 €</b></div><div><span>MASSIMO</span><b id="high">89,74 €</b></div><div><span>MINIMO</span><b id="low">88,21 €</b></div><div><span>VARIAZIONE</span><b class="positive" id="variation">+0,75 €</b></div></div>
        </div>
      </div>
    </section>

    <section class="trust" id="metodo">
      <div class="trust-copy"><span class="section-num">01 — IL METODO</span><h2>Un dato prezioso<br>merita <em>trasparenza.</em></h2></div>
      <div class="method-grid">
        <article><span class="method-icon">◎</span><div><h3>Benchmark globale</h3><p>Il riferimento internazionale è il prezzo dell'oro fino espresso per oncia troy.</p></div></article>
        <article><span class="method-icon">↔</span><div><h3>Conversione verificabile</h3><p>Convertiamo l'oncia in grammi e applichiamo cambio e titolo selezionato.</p></div></article>
        <article><span class="method-icon">◷</span><div><h3>Aggiornamento continuo</h3><p>Il prezzo spot viene interrogato periodicamente e l'ultimo dato resta sempre visibile.</p></div></article>
      </div>
    </section>
    <section class="sources" id="fonti"><span>FONTI DI RIFERIMENTO</span><a href="https://www.lbma.org.uk/prices-and-data/precious-metal-prices" target="_blank">LBMA <small>Gold Price</small></a><i></i><a href="https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html" target="_blank">ECB <small>Euro foreign exchange</small></a><p>Valore indicativo, non costituisce proposta d'acquisto o vendita.</p></section>
  </main>
  <footer><a class="brand" href="#"><span class="brand-mark">A</span><span>AUREA</span></a><span>© 2026 Aurea Data</span><span>Prezzi espressi al grammo</span></footer>
`;

const el = (id) => document.getElementById(id);
const format = (value) => new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const currentPrice = () => (state.ounceUsd / OUNCE_IN_GRAMS) * (state.currency === 'EUR' ? 1 / state.eurUsd : 1) * (state.purity === 18 ? 0.75 : 0.9999);

function series(count, base) {
  let seed = [...state.range].reduce((a, c) => a + c.charCodeAt(0), 19) + state.purity;
  const random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
  let value = base * 0.965;
  return Array.from({ length: count }, (_, i) => {
    value += (random() - 0.43) * base * 0.006 + Math.sin(i / 8) * base * 0.0006;
    if (i === count - 1) value = base;
    return value;
  });
}

function drawChart() {
  const values = series(ranges[state.range], currentPrice());
  const width = 900, height = 350, left = 12, right = 68, top = 20, bottom = 42;
  const min = Math.min(...values) * 0.996, max = Math.max(...values) * 1.004;
  const x = (i) => left + i / (values.length - 1) * (width - left - right);
  const y = (v) => top + (max - v) / (max - min) * (height - top - bottom);
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const area = `${left},${height-bottom} ${points} ${width-right},${height-bottom}`;
  const labels = [max, (max + min) / 2, min];
  const symbol = state.currency === 'EUR' ? '€' : '$';
  el('chart').innerHTML = `<defs><linearGradient id="goldFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d5af62" stop-opacity=".28"/><stop offset="1" stop-color="#d5af62" stop-opacity="0"/></linearGradient></defs>
    ${[0,1,2].map((n) => `<line x1="${left}" y1="${top + n*(height-top-bottom)/2}" x2="${width-right}" y2="${top + n*(height-top-bottom)/2}" class="grid-line"/>`).join('')}
    <polygon points="${area}" fill="url(#goldFade)"/><polyline points="${points}" class="price-line"/>
    ${labels.map((v,n) => `<text x="${width-54}" y="${top+n*(height-top-bottom)/2+4}" class="axis-price">${format(v)} ${symbol}</text>`).join('')}
    ${['24 AGO','01 SET','08 SET','15 SET','22 SET'].map((d,n) => `<text x="${left+n*(width-left-right)/4}" y="${height-12}" class="axis-date" text-anchor="${n===0?'start':n===4?'end':'middle'}">${d}</text>`).join('')}
    <circle cx="${x(values.length-1)}" cy="${y(values.at(-1))}" r="5" class="last-dot"/>`;
  const svg = el('chart');
  svg.onmousemove = (event) => {
    const rect = svg.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const index = Math.max(0, Math.min(values.length - 1, Math.round(ratio * (values.length - 1))));
    const tip = el('tooltip'); tip.textContent = `${format(values[index])} ${symbol}`; tip.style.left = `${event.clientX - rect.left}px`; tip.style.top = `${y(values[index]) / height * rect.height}px`; tip.classList.add('show');
  };
  svg.onmouseleave = () => el('tooltip').classList.remove('show');
}

function render() {
  const price = currentPrice(), symbol = state.currency === 'EUR' ? '€' : '$';
  el('price').textContent = format(price); el('currency-symbol').textContent = symbol;
  el('asset-name').textContent = `Oro ${state.purity} carati`; el('crumb').textContent = `ORO ${state.purity}K`;
  el('open').textContent = `${format(price * .9916)} ${symbol}`; el('high').textContent = `${format(price * 1.0048)} ${symbol}`;
  el('low').textContent = `${format(price * .9877)} ${symbol}`; el('variation').textContent = `+${format(price * .0084)} ${symbol}`;
  drawChart();
}

el('purity').onchange = (e) => { state.purity = Number(e.target.value); render(); };
el('currency').onchange = (e) => { state.currency = e.target.value; render(); };
el('range-buttons').onclick = (e) => { if (!e.target.dataset.range) return; state.range = e.target.dataset.range; document.querySelectorAll('#range-buttons button').forEach(b => b.classList.toggle('active', b === e.target)); drawChart(); };

async function refreshMarket() {
  try {
    const [gold, fx] = await Promise.all([
      fetch('https://api.gold-api.com/price/XAU').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch('https://api.frankfurter.app/latest?from=EUR&to=USD').then(r => { if (!r.ok) throw new Error(); return r.json(); })
    ]);
    if (gold.price) state.ounceUsd = gold.price;
    if (fx.rates?.USD) state.eurUsd = fx.rates.USD;
    state.connected = true;
    el('market-status').innerHTML = '<i></i> Dati live';
    el('updated').textContent = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(new Date());
    render();
  } catch {
    state.connected = false;
    el('updated').textContent = 'ultimo dato';
    el('market-status').innerHTML = '<i></i> Dati di fallback';
    el('market-status').classList.add('offline');
  }
}

render(); refreshMarket(); setInterval(refreshMarket, 60000);
