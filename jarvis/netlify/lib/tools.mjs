import { LISTINO, CATEGORIE, OWNER } from './config.mjs';
import { rome, oraRoma } from './time.mjs';
import { loadCantiere, salva, nuovoId } from './db.mjs';
import { numeri, listaChiamate, valore } from './business.mjs';
import { eventiTra } from './calendar.mjs';

const STATI = ['nuovo', 'chiamato', 'appuntamento', 'vinto', 'perso'];
const PKG = Object.keys(LISTINO);

export const TOOLS = [
  {
    name: 'situazione_fatturato',
    description: 'Incassi del mese, obiettivo, trattative aperte e pipeline. Usalo per ogni domanda su soldi, fatturato o trattative.',
    input_schema: { type: 'object', properties: { mese: { type: 'string', description: 'YYYY-MM, default mese corrente' } } },
  },
  {
    name: 'cerca_lead',
    description: 'Cerca contatti in MF Agency per comune, stato, owner o testo libero.',
    input_schema: {
      type: 'object',
      properties: {
        comune: { type: 'string' },
        stato: { type: 'string', enum: STATI },
        owner: { type: 'string', enum: ['T', 'A'], description: 'T = Tommy, A = Alessandro' },
        testo: { type: 'string', description: 'Parte del nome o delle note' },
      },
    },
  },
  {
    name: 'chiamate_di_oggi',
    description: 'La lista dei contatti da chiamare oggi per Tommy o Alessandro.',
    input_schema: { type: 'object', properties: { owner: { type: 'string', enum: ['T', 'A'] } } },
  },
  {
    name: 'aggiungi_lead',
    description: 'Aggiunge uno o più contatti a MF Agency.',
    input_schema: {
      type: 'object',
      properties: {
        lead: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              nome: { type: 'string' },
              tel: { type: 'string' },
              comune: { type: 'string' },
              cat: { type: 'string', enum: Object.keys(CATEGORIE) },
              pkg: { type: 'string', enum: PKG },
              owner: { type: 'string', enum: ['T', 'A'] },
              stato: { type: 'string', enum: STATI },
              next: { type: 'string', description: 'Data prossima azione YYYY-MM-DD' },
              prezzo: { type: 'number', description: 'Prezzo trattato, se diverso dal listino' },
              note: { type: 'string' },
              sito: { type: 'string' },
            },
            required: ['nome'],
          },
        },
      },
      required: ['lead'],
    },
  },
  {
    name: 'aggiorna_lead',
    description: "Aggiorna un contatto esistente (serve l'id, trovalo prima con cerca_lead).",
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        stato: { type: 'string', enum: STATI },
        next: { type: 'string', description: 'YYYY-MM-DD, stringa vuota per togliere' },
        prezzo: { type: 'number' },
        pkg: { type: 'string', enum: PKG },
        aggiungi_nota: { type: 'string' },
        chiamato_oggi: { type: 'boolean' },
      },
      required: ['id'],
    },
  },
  {
    name: 'registra_incasso',
    description: 'Registra un incasso o una spesa nella sezione soldi di MF Agency.',
    input_schema: {
      type: 'object',
      properties: {
        tipo: { type: 'string', enum: ['in', 'out'] },
        importo: { type: 'number' },
        descrizione: { type: 'string' },
        data: { type: 'string', description: 'YYYY-MM-DD, default oggi' },
      },
      required: ['tipo', 'importo', 'descrizione'],
    },
  },
  {
    name: 'agenda',
    description: 'Appuntamenti del Calendario Apple di Tommy nei prossimi giorni.',
    input_schema: { type: 'object', properties: { giorni: { type: 'integer', minimum: 1, maximum: 14 } } },
  },
];

if (process.env.GOOGLE_PLACES_KEY) {
  TOOLS.push({
    name: 'trova_attivita',
    description: 'Cerca attività locali su Google (es. "fisioterapista Chiavari"). Restituisce nome, telefono, indirizzo e se hanno un sito. Poi chiedi a Tommy se aggiungerle, oppure aggiungile se lo ha già chiesto.',
    input_schema: {
      type: 'object',
      properties: { ricerca: { type: 'string' }, quante: { type: 'integer', minimum: 1, maximum: 20 } },
      required: ['ricerca'],
    },
  });
}

async function trovaAttivita({ ricerca, quante = 10 }) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': process.env.GOOGLE_PLACES_KEY,
      'X-Goog-FieldMask': 'places.displayName,places.nationalPhoneNumber,places.formattedAddress,places.websiteUri,places.businessStatus',
    },
    body: JSON.stringify({ textQuery: ricerca, languageCode: 'it', regionCode: 'IT', pageSize: Math.min(quante, 20) }),
  });
  if (!res.ok) return { errore: `Google Places ${res.status}` };
  const { places = [] } = await res.json();
  const { prospects } = await loadCantiere();
  const giaIn = new Set(prospects.map((p) => (p.tel || '').replace(/\D/g, '')).filter(Boolean));
  return places
    .filter((p) => p.businessStatus !== 'CLOSED_PERMANENTLY')
    .map((p) => ({
      nome: p.displayName?.text,
      tel: p.nationalPhoneNumber || '',
      indirizzo: p.formattedAddress,
      sito: p.websiteUri || 'nessun sito',
      gia_in_lista: giaIn.has((p.nationalPhoneNumber || '').replace(/\D/g, '')),
    }));
}

export async function eseguiTool(nome, input) {
  const oggi = rome().date;
  switch (nome) {
    case 'situazione_fatturato':
      return numeri(await loadCantiere(), input.mese || oggi.slice(0, 7));

    case 'cerca_lead': {
      const { prospects } = await loadCantiere();
      const t = (input.testo || '').toLowerCase();
      const trovati = prospects.filter((p) =>
        (!input.comune || (p.comune || '').toLowerCase().includes(input.comune.toLowerCase())) &&
        (!input.stato || (p.stato || 'nuovo') === input.stato) &&
        (!input.owner || (p.own || 'T') === input.owner) &&
        (!t || `${p.nome} ${p.note || ''}`.toLowerCase().includes(t)));
      return {
        totale: trovati.length,
        lead: trovati.slice(0, 40).map((p) => ({
          id: p.id, nome: p.nome, tel: p.tel, comune: p.comune, stato: p.stato || 'nuovo',
          pkg: p.pkg, valore: valore(p), owner: p.own || 'T', next: p.next || null, note: p.note || '',
        })),
      };
    }

    case 'chiamate_di_oggi': {
      const { prospects } = await loadCantiere();
      return listaChiamate(prospects, input.owner || OWNER.sigla, oggi)
        .map((p) => ({ id: p.id, nome: p.nome, tel: p.tel, comune: p.comune, note: p.note || '', richiamo: Boolean(p.next) }));
    }

    case 'aggiungi_lead': {
      const fatti = [];
      for (const l of input.lead) {
        const id = nuovoId();
        const pkg = PKG.includes(l.pkg) ? l.pkg : 'STANDARD';
        const doc = {
          nome: l.nome, tel: l.tel || '', comune: l.comune || '', cat: l.cat || 'san', pkg,
          own: l.owner || OWNER.sigla, stato: l.stato || 'nuovo', next: l.next || '',
          note: l.note || '', sito: l.sito || '', created: oggi,
        };
        if (l.prezzo) doc.prezzo = l.prezzo;
        await salva('prospects', id, doc);
        fatti.push({ id, nome: l.nome });
      }
      return { aggiunti: fatti.length, lead: fatti };
    }

    case 'aggiorna_lead': {
      const { prospects } = await loadCantiere();
      const p = prospects.find((x) => x.id === input.id);
      if (!p) return { errore: 'Contatto non trovato' };
      const { id, upd, ...resto } = p;
      const doc = { ...resto };
      if (input.stato) doc.stato = input.stato;
      if (input.stato === 'vinto') doc.wonDate = oggi;
      if (input.next !== undefined) doc.next = input.next;
      if (input.prezzo) doc.prezzo = input.prezzo;
      if (input.pkg) doc.pkg = input.pkg;
      if (input.chiamato_oggi) { doc.lastCall = oggi; if ((doc.stato || 'nuovo') === 'nuovo') doc.stato = 'chiamato'; }
      if (input.aggiungi_nota) doc.note = [doc.note, `${oggi}: ${input.aggiungi_nota}`].filter(Boolean).join('\n');
      await salva('prospects', id, doc);
      return { ok: true, nome: doc.nome, stato: doc.stato, next: doc.next || null };
    }

    case 'registra_incasso': {
      const id = nuovoId();
      await salva('fin', id, { type: input.tipo, amount: input.importo, label: input.descrizione, date: input.data || oggi });
      return { ok: true };
    }

    case 'agenda': {
      const ora = new Date();
      const eventi = await eventiTra(ora, new Date(ora.getTime() + (input.giorni || 1) * 864e5));
      return eventi.map((e) => ({
        titolo: e.titolo, giorno: rome(e.start).esteso, ora: e.allDay ? 'tutto il giorno' : oraRoma(e.start), luogo: e.luogo, calendario: e.cal,
      }));
    }

    case 'trova_attivita':
      return trovaAttivita(input);

    default:
      return { errore: `Strumento sconosciuto: ${nome}` };
  }
}
