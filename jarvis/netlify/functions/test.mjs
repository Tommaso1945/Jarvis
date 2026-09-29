// Per provare senza aspettare: /api/test?cosa=briefing, ?cosa=chiamate, ?cosa=agenda
import { json, negato } from '../lib/auth.mjs';
import { briefingMattino, annuncioChiamate } from '../lib/business.mjs';
import { eventiTra } from '../lib/calendar.mjs';
import { notifica } from '../lib/push.mjs';

export default async (req) => {
  const url = new URL(req.url);
  const pin = req.headers.get('x-jarvis-pin') || url.searchParams.get('pin');
  if (!process.env.JARVIS_PIN || pin !== process.env.JARVIS_PIN) return negato();
  const cosa = url.searchParams.get('cosa') || 'briefing';
  if (cosa === 'agenda') {
    const ora = new Date();
    const ev = await eventiTra(ora, new Date(ora.getTime() + 7 * 864e5));
    return json(ev.map((e) => ({ titolo: e.titolo, start: e.start, cal: e.cal })));
  }
  const testo = cosa === 'chiamate' ? await annuncioChiamate() : await briefingMattino();
  await notifica(cosa === 'chiamate' ? 'Giornata chiamate' : 'Briefing del mattino', testo, 'test');
  return json({ testo });
};

export const config = { path: '/api/test' };
