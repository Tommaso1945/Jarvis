// Gira ogni 5 minuti: briefing, lista chiamate e promemoria del calendario
import { BRIEFING, CALL_PLAN } from '../lib/config.mjs';
import { rome, toMin, isQuiet, deliveryTime } from '../lib/time.mjs';
import { once } from '../lib/db.mjs';
import { notifica } from '../lib/push.mjs';
import { eventiTra } from '../lib/calendar.mjs';
import { briefingMattino, annuncioChiamate, promemoria } from '../lib/business.mjs';

export default async () => {
  const now = new Date();
  if (isQuiet(now)) return; // scuola o notte: silenzio assoluto
  const r = rome(now);

  if (r.min >= toMin(BRIEFING) && r.min < toMin('08:00') && (await once(`briefing-${r.date}`))) {
    await notifica('Briefing del mattino', await briefingMattino(now), 'briefing');
  }

  if (CALL_PLAN.days.includes(r.dow) && r.min >= toMin(CALL_PLAN.annuncio) && r.min < toMin(CALL_PLAN.to)
      && (await once(`chiamate-${r.date}`))) {
    await notifica('Giornata chiamate', await annuncioChiamate(now), 'chiamate');
  }

  const eventi = await eventiTra(now, new Date(now.getTime() + 16 * 3600e3)).catch((e) => {
    console.error('Calendario', e.message);
    return [];
  });
  for (const ev of eventi) {
    if (ev.allDay) continue;
    if (now >= deliveryTime(ev.start) && now < ev.start
        && (await once(`ev-${ev.uid}-${ev.start.toISOString()}`))) {
      await notifica(ev.titolo, promemoria(ev), `ev-${ev.start.getTime()}`);
    }
  }
};

export const config = { schedule: '*/5 * * * *' };
