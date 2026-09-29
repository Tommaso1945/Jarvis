import { TZ, QUIET, REMINDER_MIN, MIN_DOPO_SILENZIO } from './config.mjs';

const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23',
});
const DOW = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

// Data e ora come le vede Tommy, in Italia
export function rome(d = new Date()) {
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  const hh = +p.hour, mm = +p.minute;
  return {
    date: `${p.year}-${p.month}-${p.day}`, y: +p.year, m: +p.month, d: +p.day,
    hh, mm, min: hh * 60 + mm, dow: DOW[p.weekday],
    ora: `${p.hour}:${p.minute}`,
    giorno: GIORNI[DOW[p.weekday]],
    esteso: `${GIORNI[DOW[p.weekday]]} ${+p.day} ${MESI[+p.month - 1]}`,
  };
}
export const nomeMese = (m) => MESI[m - 1];
export const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const addMin = (d, n) => new Date(d.getTime() + n * 60000);

// Se l'istante cade in una fascia silenziosa, restituisce inizio e fine di quella fascia
export function quietAt(t) {
  const r = rome(t);
  for (const w of QUIET) {
    const from = toMin(w.from), to = toMin(w.to);
    let dentro = false, daInizio = 0;
    if (from < to) {
      dentro = w.days.includes(r.dow) && r.min >= from && r.min < to;
      daInizio = r.min - from;
    } else if (r.min >= from && w.days.includes(r.dow)) {
      dentro = true; daInizio = r.min - from;
    } else if (r.min < to && w.days.includes((r.dow + 6) % 7)) {
      dentro = true; daInizio = r.min + 1440 - from;
    }
    if (dentro) {
      const base = new Date(Math.floor(t.getTime() / 60000) * 60000);
      const start = addMin(base, -daInizio);
      const durata = from < to ? to - from : to + 1440 - from;
      return { label: w.label, start, end: addMin(start, durata) };
    }
  }
  return null;
}
export const isQuiet = (t = new Date()) => Boolean(quietAt(t));

// Quando mandare il promemoria di un appuntamento
export function deliveryTime(start) {
  const at = addMin(start, -REMINDER_MIN);
  const q = quietAt(at);
  if (!q) return at;
  if (start - q.end >= MIN_DOPO_SILENZIO * 60000) return q.end; // appena finisce la fascia
  return addMin(q.start, -5); // altrimenti subito prima che inizi
}

export const oraRoma = (d) => rome(d).ora;
