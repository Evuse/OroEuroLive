# Aurea — quotazione dell'oro al grammo

Aurea è una dashboard web in italiano che mostra il valore indicativo dell'oro
18 o 24 carati al grammo, in euro oppure dollari. Include un grafico interattivo,
diversi intervalli temporali e il collegamento alle fonti di riferimento LBMA ed
ECB.

## Avvio rapido (senza installare nulla)

1. Clona o scarica il repository.
2. Entra nella cartella `OroEuroLive`.
3. Apri **`index.html`** con un doppio clic.

La pagina e tutte le sue funzioni principali vengono caricate anche tramite
`file://`: JavaScript e CSS usano percorsi relativi, i caratteri hanno fallback
di sistema e l'interfaccia non richiede un server né risorse grafiche remote.
Se il browser o la rete bloccano le richieste alle quotazioni esterne, la
dashboard continua a funzionare mostrando l'ultimo valore di fallback e la
dicitura “ultimo dato”.

## Sviluppo locale (consigliato)

Richiede [Node.js](https://nodejs.org/) 20.19 o superiore.

```bash
git clone <URL-DEL-REPOSITORY>
cd OroEuroLive
npm install
npm run dev
```

Apri quindi l'indirizzo indicato da Vite, normalmente
<http://localhost:5173>. Il server ricarica automaticamente la pagina quando
modifichi un file.

## Build di produzione

```bash
npm install
npm run build
```

Lo script di build genera la cartella `dist/`. Puoi:

- aprire direttamente **`dist/index.html`**;
- oppure provarla con un server locale eseguendo `npm run preview` e aprendo
  l'indirizzo mostrato nel terminale.

Tutti i riferimenti usano percorsi relativi, quindi la build funziona anche in
una sottocartella, su GitHub Pages o aperta direttamente dal disco. La build
copia volutamente gli stessi asset già verificati alla radice: non esistono due
versioni diverse dell'applicazione da mantenere.

## Come viene calcolato il prezzo

Il prezzo visualizzato è ottenuto dal prezzo spot XAU per oncia troy:

```text
prezzo/grammo = prezzo XAU/USD ÷ 31,1034768 ÷ cambio EUR/USD × purezza
```

- Per **18 carati** viene applicato il coefficiente `0,75`.
- Per **24 carati** viene applicato il coefficiente `0,9999`.
- In modalità USD non viene applicata la conversione EUR/USD.
- L'app tenta un aggiornamento ogni 60 secondi e conserva valori di fallback
  quando il servizio esterno non è raggiungibile.

Il prezzo è indicativo e non costituisce una proposta di acquisto o vendita.
LBMA è il benchmark internazionale mostrato come fonte di riferimento; ECB è la
fonte di riferimento per il cambio. Il feed spot utilizzato per l'aggiornamento
continuo è Gold API, mentre il cambio viene letto tramite Frankfurter.

## Struttura del progetto

```text
.
├── index.html                 # pagina e punti di ingresso CSS/JS
├── assets/
│   ├── main.js                # interfaccia, calcoli, grafico e aggiornamenti
│   └── style.css              # stile responsive
├── scripts/build.mjs          # genera la cartella dist senza cambiare i percorsi
├── vite.config.js             # server di sviluppo con percorsi relativi
└── package.json               # comandi npm
```

## Risoluzione dei problemi

### Vedo “ultimo dato”

L'interfaccia è attiva, ma il browser non ha raggiunto uno dei servizi esterni.
Controlla la connessione, eventuali estensioni anti-tracciamento, proxy o policy
aziendali. Le tendine, il grafico e le conversioni restano utilizzabili.

### Vedo ancora una pagina bianca

1. Assicurati di aver aggiornato il clone con `git pull`.
2. Verifica che esistano `assets/main.js` e `assets/style.css`.
3. Forza il ricaricamento con <kbd>Ctrl</kbd>+<kbd>F5</kbd> (Windows/Linux) o
   <kbd>⌘</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> (macOS).
4. In alternativa esegui `npm run dev` e usa esattamente l'URL mostrato nel
   terminale; non aprire una vecchia copia di `dist/index.html`.
