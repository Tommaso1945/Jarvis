// Tutte le regole di Jarvis. Per cambiare un orario si cambia qui e si fa deploy.

export const TZ = 'Europe/Rome';
export const OWNER = { nome: 'Tommy', sigla: 'T', socio: 'Alessandro', siglaSocio: 'A' };

// Fasce silenziose. days: 0 = domenica ... 6 = sabato
export const QUIET = [
  { label: 'scuola', days: [1, 2, 3, 4, 5, 6], from: '08:00', to: '13:40' },
  { label: 'notte', days: [0, 1, 2, 3, 4, 5, 6], from: '22:40', to: '05:40' },
];

export const BRIEFING = '05:40';
export const REMINDER_MIN = 150; // 2 ore e mezza prima di ogni appuntamento
export const MIN_DOPO_SILENZIO = 30; // regola "fine fascia" per i promemoria

export const CALL_PLAN = {
  days: [2, 3, 4], // martedì, mercoledì, giovedì
  from: '14:30',
  to: '17:30',
  annuncio: '13:40',
  perPersona: 6,
};

// Listino. Il Base non si tratta, Pro e Max sì.
export const LISTINO = {
  STANDARD: { nome: 'Base', prezzo: 800, trattabile: false },
  PRO: { nome: 'Pro', prezzo: 1200, trattabile: true },
  MAX: { nome: 'Max', prezzo: 2000, trattabile: true, target: [1600, 1700] },
};

export const CATEGORIE = {
  ric: 'Strutture ricettive', san: 'Sanità privata', ris: 'Ristorazione',
  ben: 'Benessere & estetica', nau: 'Nautica', pro: 'Professionisti', lux: 'Eventi & lusso',
};

// Copiate da MF Agency, così il briefing sa in che fase siete
export const FASI = [
  { n: 'Armamento', d1: '2026-09-21', d2: '2026-10-04' },
  { n: "La finestra d'oro", d1: '2026-10-05', d2: '2026-11-30' },
  { n: 'Produzione & volume', d1: '2026-12-01', d2: '2027-02-15' },
  { n: 'Le consegne', d1: '2027-02-16', d2: '2027-03-31' },
  { n: 'La raccolta', d1: '2027-04-01', d2: '2027-06-12' },
];
export const MILESTONE = [
  { d: '2026-11-30', t: 'ultimo giorno per firmare i turistici' },
  { d: '2026-12-23', t: 'inizio finestra Natale' },
  { d: '2027-03-25', t: 'tutto il turistico online' },
  { d: '2027-06-12', t: 'traguardo' },
];
