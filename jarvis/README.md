# Jarvis · MF Agency

Assistente personale di Tommy. Legge e scrive su MF Agency, legge il Calendario Apple
e manda notifiche sull'iPhone rispettando scuola e notte.

## Cosa fa da solo
- **05:40** briefing del mattino: agenda, giornata chiamate, richiami in ritardo, incassi del mese, fase.
- **Mar, mer, gio alle 13:40** la lista dei 6 contatti da chiamare (14:30-17:30).
- **2 ore e mezza prima** di ogni appuntamento del calendario (dentista, allenamento, clienti).
- **Silenzio** dalle 08:00 alle 13:40 (lun-sab) e dalle 22:40 alle 05:40.
  Se un promemoria cade nel silenzio arriva alle 13:40 (o alle 05:40), oppure prima che il silenzio inizi
  se l'appuntamento è troppo vicino.

Orari e regole si cambiano in `netlify/lib/config.mjs`.

## Messa online (una volta sola)

1. **GitHub.** Crea un repository privato `jarvis` e carica tutta questa cartella.
2. **Netlify.** Add new site → Import an existing project → scegli il repository → Deploy.
3. **Chiavi per le notifiche.** Nel terminale, dentro la cartella del progetto:
   `npx web-push generate-vapid-keys`
   Ti dà una Public Key e una Private Key.
4. **Variabili d'ambiente.** Netlify → Site configuration → Environment variables. Aggiungi:

| Nome | Cosa metterci |
|---|---|
| `ANTHROPIC_API_KEY` | la chiave API generata dall'account del genitore |
| `JARVIS_MODEL` | `claude-sonnet-5-5` |
| `JARVIS_PIN` | un PIN che inventi tu, 6 cifre |
| `FIREBASE_URL` | lo stesso indirizzo che c'è in MF Agency → Sincronizzazione |
| `APPLE_ID` | l'email del tuo ID Apple |
| `APPLE_APP_PASSWORD` | la password specifica per app "Jarvis" |
| `VAPID_PUBLIC` | la Public Key del punto 3 |
| `VAPID_PRIVATE` | la Private Key del punto 3 |
| `VAPID_EMAIL` | la tua email |
| `GOOGLE_PLACES_KEY` | facoltativa, serve per "trovami fisioterapisti a Chiavari" |

5. **Rifai il deploy** (Deploys → Trigger deploy) così legge le variabili.

## Sull'iPhone
1. Apri il sito in **Safari** → Condividi → **Aggiungi alla schermata Home**.
2. Apri Jarvis **dall'icona** (le notifiche funzionano solo così).
3. Inserisci il PIN → **Attiva notifiche**. Arriva subito una notifica di prova.
4. Siri: app Comandi → + → azione "Apri URL" con l'indirizzo del sito → chiamalo "Jarvis".
   Ora "Ehi Siri, Jarvis" lo apre. Per dettare usa il microfono della tastiera.

## Prove senza aspettare le 5:40
Nel browser (sostituisci indirizzo e PIN):
- `https://TUO-SITO.netlify.app/api/test?cosa=agenda&pin=123456` → i tuoi appuntamenti dei prossimi 7 giorni
- `...?cosa=briefing&pin=123456` → manda subito il briefing
- `...?cosa=chiamate&pin=123456` → manda subito la lista chiamate

Controlla che gli eventi ricorrenti (allenamenti) abbiano l'orario giusto nella prova agenda.

## Primi comandi
- "Registra un incasso di 360 euro, sito Essenza di Rosa, 15 giugno"
- "Aggiungi trattativa: Essenza di Rosa upgrade Max, 1600 euro, appuntamento 24 ottobre"
- "Chi devo chiamare oggi?"
- "Ho chiamato Studio Chiavari, richiamare il 3 novembre"
- "Quanto ho incassato questo mese?"
- "Trovami 10 ristoranti a Lavagna senza sito e aggiungili"

## Sicurezza
Il database di MF Agency oggi è aperto: chi ha l'indirizzo può leggerlo e cancellarlo.
Prossimo passo: regole Firebase con chiave segreta (`FIREBASE_SECRET`), da aggiornare anche nell'app.
