# Aurea Markets

Dashboard professionale per seguire il valore intrinseco dell'oro 18K e 24K al
grammo, in EUR o USD. Mostra esclusivamente dati recuperati dalle fonti indicate:
se una fonte non risponde, non inventa né interpola un prezzo.

## Avvio

Richiede Node.js 20 o successivo. Non sono necessarie chiavi API.

```bash
git clone <URL-DEL-REPOSITORY>
cd OroEuroLive
npm install
npm start
```

Apri **http://localhost:5173**. L'applicazione aggiorna il mercato ogni minuto.
Per sviluppare con riavvio automatico usa `npm run dev`.

> `index.html` può ancora essere aperto direttamente per vedere l'interfaccia,
> ma i browser non consentono a una pagina `file://` di chiamare l'API locale.
> Per prezzi reali e storico bisogna usare `npm start`. In modalità diretta la UI
> mostra quindi “Feed non disponibile”, mai numeri fittizi.

## Fonti e attendibilità

Ogni fonte, valore e data di aggiornamento sono visibili nel pannello
**Provenienza del dato** della dashboard.

| Dato | Fonte | Uso |
| --- | --- | --- |
| XAU/USD spot | [Gold API](https://gold-api.com/) | Ultimo prezzo spot disponibile per oncia troy |
| EUR/USD | [Banca Centrale Europea](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html) | Cambio di riferimento ufficiale giornaliero |
| Storico XAU/USD | [Stooq](https://stooq.com/q/d/?s=xauusd) | Chiusure giornaliere reali del grafico |
| Benchmark | [LBMA Gold Price](https://www.lbma.org.uk/prices-and-data/precious-metal-prices) | Riferimento internazionale del mercato professionale |

LBMA è un benchmark amministrato e soggetto a licenza: non viene presentato
impropriamente come feed gratuito in tempo reale. La dashboard lo mostra come
riferimento verificabile; il valore continuo è identificato separatamente come
spot Gold API. Anche lo storico Stooq è dichiarato esplicitamente.

Il server valida inoltre intervalli plausibili per spot, cambio e storico. Se
anche una sola fonte necessaria non risponde o restituisce dati non validi,
l'endpoint risponde con un errore e la dashboard non mostra valori stimati.

## Formula

```text
USD/grammo = XAU/USD ÷ 31,1034768 × purezza
EUR/grammo = XAU/USD ÷ 31,1034768 × purezza ÷ EUR/USD
```

- 18 carati: purezza `0,750`.
- 24 carati: purezza `0,9999`.
- Il cambio ECB esprime quanti dollari corrispondono a un euro; per questo la
  conversione da USD a EUR avviene tramite divisione.
- Il valore riguarda solo il contenuto aureo e non include spread, commissioni,
  lavorazione, imposte o margine del compro-oro.

La formula completa e i suoi valori correnti sono sempre visibili nella
dashboard.

## Build e distribuzione

```bash
npm run check
npm run build
cd dist
node server.mjs
```

La cartella `dist/` contiene interfaccia e server. Il processo ascolta la porta
`5173`, oppure la porta definita nella variabile d'ambiente `PORT`:

```bash
PORT=8080 npm start
```

Per un deploy pubblico è consigliato eseguire `server.mjs` dietro un reverse
proxy HTTPS. Il proxy server-side evita i problemi CORS delle fonti esterne e
mantiene una cache breve: 55 secondi per lo spot e un'ora per cambio e storico.

## Endpoint

`GET /api/market?days=31` restituisce:

- spot XAU/USD e relativo timestamp;
- cambio ECB EUR/USD e data ufficiale;
- storico giornaliero XAU/USD richiesto;
- timestamp dell'aggregazione.

Gli intervalli ammessi sono limitati dal server tra 7 e 1.827 giorni.

## Risoluzione dei problemi

### La dashboard dice “Feed non disponibile”

1. Verifica di aver aperto `http://localhost:5173`, non `index.html` con doppio
   clic.
2. Controlla il terminale in cui è in esecuzione `npm start`: indica quale fonte
   non ha risposto.
3. Verifica che proxy, firewall o DNS consentano l'accesso HTTPS a Gold API, ECB
   e Stooq.
4. Prova l'aggregatore con:

   ```bash
   curl 'http://localhost:5173/api/market?days=31'
   ```

### I prezzi di un negozio sono differenti

È normale: Aurea calcola il valore teorico del metallo fino contenuto nell'oggetto.
Un operatore applica spread, costi, margini e una valutazione dello stato del
materiale. Aurea non presenta il valore spot come prezzo garantito di acquisto.
