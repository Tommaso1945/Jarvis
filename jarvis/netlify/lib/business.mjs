import { LISTINO, CALL_PLAN, OWNER, FASI, MILESTONE } from './config.mjs';
import { rome, nomeMese, oraRoma } from './time.mjs';
import { loadCantiere } from './db.mjs';
import { eventiTra } from './calendar.mjs';

export const euro = (n) => `${Math.round(n || 0).toLocaleString('it-IT')} euro`;
export const valore = (p) => Number(p.prezzo) || LISTINO[p.pkg]?.prezzo || LISTINO.STANDARD.prezzo;
const aperto = (p) => !['vinto', 'perso'].includes(p.stato || 'nuovo');
const giorniTra = (a, b) => Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 864e5);

export function numeri({ prospects, fin, cfg }, meseIso) {
  const incassi = fin.filter((f) => f.type === 'in');
  const uscite = fin.filter((f) => f.type === 'out');
  const somma = (xs) => xs.reduce((a, f) => a + (Number(f.amount) || 0), 0);
  const delMese = (xs) => xs.filter((f) => (f.date || '').startsWith(meseIso));
  const trattative = prospects.filter((p) => p.stato === 'appuntamento');
  return {
    mese: meseIso,
    incassatoMese: somma(delMese(incassi)),
    speseMese: somma(delMese(uscite)),
    incassatoTotale: somma(incassi),
    obiettivoMese: Number(cfg.goal) || 3000,
    trattative: trattative.map((p) => ({ nome: p.nome, pacchetto: LISTINO[p.pkg]?.nome || p.pkg, valore: valore(p), data: p.next || null, owner: p.own || 'T' })),
    pipeline: trattative.reduce((a, p) => a + valore(p), 0),
    clienti: prospects.filter((p) => p.stato === 'vinto').length,
  };
}

// I contatti da chiamare oggi: prima i richiami scaduti, poi i nuovi
export function listaChiamate(prospects, owner = OWNER.sigla, oggi = rome().date, n = CALL_PLAN.perPersona) {
  const miei = prospects.filter((p) => (p.own || 'T') === owner && aperto(p) && p.stato !== 'appuntamento');
  const richiami = miei.filter((p) => p.next && p.next <= oggi).sort((a, b) => a.next.localeCompare(b.next));
  const nuovi = miei.filter((p) => (p.stato || 'nuovo') === 'nuovo' && !p.next);
  return [...richiami, ...nuovi].slice(0, n);
}

function fase(oggi) {
  const f = FASI.find((x) => oggi >= x.d1 && oggi <= x.d2);
  const m = MILESTONE.find((x) => x.d >= oggi);
  const parti = [];
  if (f) parti.push(`Fase "${f.n}": ${giorniTra(oggi, f.d2)} giorni alla fine.`);
  if (m) parti.push(`Prossima scadenza tra ${giorniTra(oggi, m.d)} giorni: ${m.t}.`);
  return parti.join(' ');
}

export async function briefingMattino(now = new Date()) {
  const r = rome(now);
  const data = await loadCantiere();
  const fineGiornata = new Date(now.getTime() + (1440 - r.min) * 60000);
  const eventi = await eventiTra(now, fineGiornata).catch(() => []);
  const n = numeri(data, r.date.slice(0, 7));
  const righe = [`Buongiorno, Sir. Oggi è ${r.esteso}.`];

  const conOra = eventi.filter((e) => !e.allDay);
  const tuttoGiorno = eventi.filter((e) => e.allDay);
  righe.push(conOra.length
    ? `Agenda: ${conOra.map((e) => `alle ${oraRoma(e.start)} ${e.titolo}`).join(', ')}.`
    : 'Nessun appuntamento con orario oggi.');
  if (tuttoGiorno.length) righe.push(`Tutto il giorno: ${tuttoGiorno.map((e) => e.titolo).join(', ')}.`);

  if (CALL_PLAN.days.includes(r.dow)) {
    const lista = listaChiamate(data.prospects, OWNER.sigla, r.date);
    righe.push(`Oggi è giornata chiamate, dalle ${CALL_PLAN.from} alle ${CALL_PLAN.to}: ha ${lista.length} contatti pronti. Le do la lista alle ${CALL_PLAN.annuncio}.`);
  }
  const ritardo = data.prospects.filter((p) => (p.own || 'T') === OWNER.sigla && aperto(p) && p.next && p.next < r.date);
  if (ritardo.length) {
    righe.push(`Richiami in ritardo: ${ritardo.length}${ritardo.length <= 3 ? ` (${ritardo.map((p) => p.nome).join(', ')})` : ''}.`);
  }
  const perc = Math.round((n.incassatoMese / n.obiettivoMese) * 100);
  righe.push(`${nomeMese(r.m).replace(/^./, (c) => c.toUpperCase())}: ${euro(n.incassatoMese)} incassati su ${euro(n.obiettivoMese)}, pari al ${perc}%.`);
  if (n.trattative.length) righe.push(`In pipeline: ${n.trattative.length === 1 ? 'una trattativa' : `${n.trattative.length} trattative`} per circa ${euro(n.pipeline)}.`);
  const f = fase(r.date);
  if (f) righe.push(f);
  righe.push('Buona giornata, Capo.');
  return righe.join('\n');
}

export async function annuncioChiamate(now = new Date()) {
  const r = rome(now);
  const { prospects } = await loadCantiere();
  const lista = listaChiamate(prospects, OWNER.sigla, r.date);
  if (!lista.length) {
    return 'Sir, oggi è giornata chiamate ma non ha contatti da chiamare in lista. Mi chieda di trovarne di nuovi, per esempio: trovami dieci fisioterapisti a Chiavari.';
  }
  const righe = [`Sir, giornata chiamate: dalle ${CALL_PLAN.from} alle ${CALL_PLAN.to}. I suoi ${lista.length} di oggi:`];
  lista.forEach((p, i) => {
    const tipo = p.next ? 'richiamo' : 'nuovo';
    righe.push(`${i + 1}. ${p.nome} (${p.comune || '—'}) — ${p.tel || 'senza numero'} — ${tipo}${p.note ? `. ${p.note}` : ''}`);
  });
  righe.push('Segni ogni esito appena chiude la telefonata. Se vuole, lo dica a me.');
  return righe.join('\n');
}

export function promemoria(ev) {
  const quando = oraRoma(ev.start);
  return `Sir, alle ${quando} ha: ${ev.titolo}${ev.luogo ? `, a ${ev.luogo}` : ''}.`;
}
