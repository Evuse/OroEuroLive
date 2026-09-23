const GRAMS_PER_TROY_OUNCE = 31.1034768;
const state = { purity: 18, currency: 'EUR', range: '1M', market: null, history: [], hover: null };
const rangeDays = { '1S': 7, '1M': 31, '3M': 93, '6M': 186, '1A': 366, '5A': 1827 };
const $ = (selector) => document.querySelector(selector);
const money = (value, currency = state.currency, digits = 2) => value == null || !Number.isFinite(value) ? '—' : new Intl.NumberFormat('it-IT', { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
const number = (value, digits = 2) => value == null || !Number.isFinite(value) ? '—' : new Intl.NumberFormat('it-IT', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
const purityFactor = () => state.purity === 18 ? 0.75 : 0.9999;
const perGram = (ounceUsd) => ounceUsd / GRAMS_PER_TROY_OUNCE * purityFactor() / (state.currency === 'EUR' ? state.market.eurUsd : 1);

$('#app').innerHTML = `
  <header class="topbar">
    <a class="brand" href="#"><span>A</span>AUREA <small>MARKETS</small></a>
    <div class="ticker"><b>XAU/USD</b><strong id="top-xau">—</strong><span id="top-change">—</span></div>
    <div class="top-actions"><span class="connection" id="connection"><i></i> Connessione…</span><span class="clock" id="clock"></span></div>
  </header>
  <div class="workspace">
    <aside class="sidebar">
      <div class="side-title"><span>LISTA MERCATI</span><button aria-label="Aggiungi">＋</button></div>
      <button class="market-row selected" data-purity="18"><span class="metal-icon">Au</span><span><b>Oro 18K</b><small>EUR / grammo</small></span><strong id="watch-18">—</strong></button>
      <button class="market-row" data-purity="24"><span class="metal-icon pale">Au</span><span><b>Oro 24K</b><small>EUR / grammo</small></span><strong id="watch-24">—</strong></button>
      <div class="side-title second"><span>RIFERIMENTI</span></div>
      <div class="reference"><span>EUR / USD</span><b id="side-fx">—</b><small>ECB</small></div>
      <div class="reference"><span>Oncia troy</span><b>31,1034768 g</b><small>Standard</small></div>
      <div class="sidebar-note"><i>i</i><p>Prezzo indicativo del metallo, al netto di commissioni e lavorazione.</p></div>
    </aside>

    <main class="dashboard">
      <section class="instrument-head">
        <div class="instrument-title"><div class="gold-orb">Au</div><div><div class="breadcrumb">METALLI / ORO / <span id="crumb">18 CARATI</span></div><h1 id="instrument">Oro 18 carati <small>• GRAMMO</small></h1></div></div>
        <div class="controls">
          <label>PUREZZA<select id="purity"><option value="18">18 carati · 750‰</option><option value="24">24 carati · 999,9‰</option></select></label>
          <label>VALUTA<select id="currency"><option value="EUR">EUR €</option><option value="USD">USD $</option></select></label>
        </div>
      </section>

      <section class="price-strip">
        <div class="main-price"><span id="price">—</span><div><b id="change">In attesa dei dati</b><small>variazione periodo</small></div></div>
        <div class="metric"><span>APERTURA</span><b id="open">—</b></div><div class="metric"><span>MASSIMO</span><b id="high">—</b></div><div class="metric"><span>MINIMO</span><b id="low">—</b></div><div class="metric"><span>ULTIMO UPDATE</span><b id="updated">—</b></div>
      </section>

      <section class="chart-card">
        <div class="chart-toolbar"><div class="ranges">${Object.keys(rangeDays).map(r => `<button data-range="${r}" class="${r === '1M' ? 'active' : ''}">${r}</button>`).join('')}</div><div class="chart-actions"><span>LINEA</span><button id="refresh">↻ Aggiorna</button></div></div>
        <div class="chart-stage"><svg id="chart" viewBox="0 0 1100 480" preserveAspectRatio="none" aria-label="Storico reale del prezzo dell'oro"></svg><div class="crosshair" id="crosshair"></div><div class="chart-tip" id="chart-tip"></div><div class="chart-empty" id="chart-empty"><b>Caricamento mercato…</b><span>Recupero delle quotazioni storiche reali</span></div></div>
        <div class="volume-label" id="history-label">STORICO ORO · CHIUSURE GIORNALIERE</div>
      </section>

      <section class="bottom-grid">
        <div class="panel source-panel"><div class="panel-title"><span>PROVENIENZA DEL DATO</span><span class="verified">● FONTI VISIBILI</span></div><div id="sources"></div></div>
        <div class="panel calc-panel"><div class="panel-title"><span>CALCOLO TRASPARENTE</span></div><div class="formula"><span id="formula-ounce">— USD</span><i>÷</i><span>31,1034768 g</span><i>×</i><span id="formula-purity">0,750</span><i>÷</i><span id="formula-fx">— EUR/USD</span><b>= <em id="formula-result">—</em></b></div></div>
      </section>
      <p class="disclaimer">Quotazione indicativa del solo contenuto aureo. Non costituisce consulenza finanziaria né proposta di acquisto o vendita.</p>
    </main>
  </div>`;

function renderMarket() {
  if (!state.market) return;
  const m = state.market;
  const price = perGram(m.ounceUsd);
  const convertedHistory = state.history.map(row => ({ ...row, value: perGram(row.close) }));
  const first = convertedHistory[0]?.value;
  const change = first ? (price / first - 1) * 100 : null;
  $('#price').textContent = money(price);
  $('#top-xau').textContent = money(m.ounceUsd, 'USD');
  $('#top-change').textContent = m.spotChangePercent == null ? 'SPOT' : `${m.spotChangePercent >= 0 ? '+' : ''}${number(m.spotChangePercent)}%`;
  $('#watch-18').textContent = money(m.ounceUsd / GRAMS_PER_TROY_OUNCE * .75 / m.eurUsd, 'EUR');
  $('#watch-24').textContent = money(m.ounceUsd / GRAMS_PER_TROY_OUNCE * .9999 / m.eurUsd, 'EUR');
  $('#side-fx').textContent = number(m.eurUsd, 4);
  $('#change').textContent = change == null ? '—' : `${change >= 0 ? '▲ +' : '▼ '}${number(change)}%`;
  $('#change').className = change >= 0 ? 'up' : 'down';
  const values = convertedHistory.map(x => x.value);
  $('#open').textContent = money(first);
  $('#high').textContent = money(values.length ? Math.max(...values) : null);
  $('#low').textContent = money(values.length ? Math.min(...values) : null);
  $('#updated').textContent = new Intl.DateTimeFormat('it-IT', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(m.updatedAt));
  $('#formula-ounce').textContent = `${number(m.ounceUsd)} USD`;
  $('#formula-purity').textContent = state.purity === 18 ? '0,750' : '0,9999';
  $('#formula-fx').textContent = state.currency === 'EUR' ? number(m.eurUsd, 4) + ' EUR/USD' : '1,0000 USD';
  $('#formula-result').textContent = money(price);
  $('#history-label').textContent = `${m.historySource || 'Yahoo Finance'} · CHIUSURE GIORNALIERE`;
  $('#instrument').innerHTML = `Oro ${state.purity} carati <small>• GRAMMO</small>`;
  $('#crumb').textContent = `${state.purity} CARATI`;
  document.querySelectorAll('.market-row').forEach(row => row.classList.toggle('selected', Number(row.dataset.purity) === state.purity));
  renderSources(); drawChart(convertedHistory);
}

function renderSources() {
  const m = state.market;
  const sources = [
    { name: m.spotSource, role: 'Prezzo oro USD/oncia', value: money(m.ounceUsd, 'USD'), time: m.spotTimestamp, url: m.spotSourceUrl },
    { name: m.fxSource, role: 'Cambio EUR/USD', value: number(m.eurUsd, 4), time: m.fxDate, url: m.fxSourceUrl },
    { name: m.historySource, role: 'Storico giornaliero', value: `${state.history.length} sedute`, time: state.history.at(-1)?.date, url: m.historySourceUrl },
    { name: 'LBMA', role: 'Benchmark internazionale', value: 'Riferimento', time: 'Gold Price', url: 'https://www.lbma.org.uk/prices-and-data/precious-metal-prices' }
  ];
  $('#sources').innerHTML = sources.map(s => `<a class="source-row" href="${s.url}" target="_blank" rel="noreferrer"><span class="source-check">✓</span><span><b>${s.name}</b><small>${s.role}</small></span><strong>${s.value}<small>${s.time || '—'}</small></strong><i>↗</i></a>`).join('');
}

function drawChart(data) {
  const svg = $('#chart');
  if (data.length < 2) { svg.innerHTML = ''; $('#chart-empty').classList.add('show'); return; }
  $('#chart-empty').classList.remove('show');
  const W = 1100, H = 480, L = 18, R = 82, T = 24, B = 44;
  const values = data.map(d => d.value), min = Math.min(...values), max = Math.max(...values), pad = (max - min || 1) * .1;
  const lo = min - pad, hi = max + pad, x = i => L + i / (data.length - 1) * (W-L-R), y = v => T + (hi-v)/(hi-lo)*(H-T-B);
  const points = data.map((d,i) => `${x(i)},${y(d.value)}`).join(' '), area = `${L},${H-B} ${points} ${W-R},${H-B}`;
  const ticks = Array.from({length:5},(_,i)=>hi-i*(hi-lo)/4), dateTicks = Array.from({length:6},(_,i)=>Math.round(i*(data.length-1)/5));
  svg.innerHTML = `<defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#dfbd70" stop-opacity=".22"/><stop offset="1" stop-color="#dfbd70" stop-opacity="0"/></linearGradient></defs>${ticks.map((v,i)=>`<line x1="${L}" y1="${y(v)}" x2="${W-R}" y2="${y(v)}" class="grid"/><text x="${W-R+13}" y="${y(v)+4}" class="axis">${number(v)}</text>`).join('')}<polygon points="${area}" fill="url(#area)"/><polyline points="${points}" class="line"/>${dateTicks.map(i=>`<text x="${x(i)}" y="${H-14}" class="axis date" text-anchor="${i===0?'start':i===data.length-1?'end':'middle'}">${new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'short',year:data.length>370?'2-digit':undefined}).format(new Date(data[i].date+'T12:00:00'))}</text>`).join('')}<circle cx="${x(data.length-1)}" cy="${y(data.at(-1).value)}" r="5" class="dot"/>`;
  svg.onmousemove = e => { const r=svg.getBoundingClientRect(), i=Math.max(0,Math.min(data.length-1,Math.round((e.clientX-r.left)/r.width*(data.length-1)))), d=data[i], cx=x(i)/W*r.width, cy=y(d.value)/H*r.height; $('#crosshair').style.left=cx+'px'; $('#crosshair').classList.add('show'); const tip=$('#chart-tip'); tip.innerHTML=`<span>${d.date}</span><b>${money(d.value)}</b><small>XAU/USD ${money(d.close,'USD')}</small>`; tip.style.left=Math.min(cx,r.width-150)+'px'; tip.style.top=Math.max(8,cy-75)+'px'; tip.classList.add('show'); };
  svg.onmouseleave=()=>{$('#crosshair').classList.remove('show');$('#chart-tip').classList.remove('show');};
}

async function loadMarket() {
  $('#connection').innerHTML='<i></i> Aggiornamento…';
  try {
    const response = await fetch(`/api/market?days=${rangeDays[state.range]}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    state.market = payload.market; state.history = payload.history;
    $('#connection').innerHTML='<i></i> Dati verificati'; $('#connection').className='connection live'; renderMarket();
  } catch (error) {
    $('#connection').innerHTML='<i></i> Feed non disponibile'; $('#connection').className='connection error';
    $('#chart-empty').innerHTML='<b>Dati live non disponibili</b><span>Avvia con <code>npm start</code>. Nessun valore stimato viene mostrato.</span>'; $('#chart-empty').classList.add('show');
  }
}

$('#purity').onchange=e=>{state.purity=Number(e.target.value);renderMarket();};
$('#currency').onchange=e=>{state.currency=e.target.value;renderMarket();};
document.querySelectorAll('.market-row').forEach(r=>r.onclick=()=>{$('#purity').value=r.dataset.purity;state.purity=Number(r.dataset.purity);renderMarket();});
$('.ranges').onclick=e=>{if(!e.target.dataset.range)return;state.range=e.target.dataset.range;document.querySelectorAll('.ranges button').forEach(b=>b.classList.toggle('active',b===e.target));loadMarket();};
$('#refresh').onclick=loadMarket;
setInterval(()=>$('#clock').textContent=new Intl.DateTimeFormat('it-IT',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date()),1000);
loadMarket(); setInterval(loadMarket,60000);
