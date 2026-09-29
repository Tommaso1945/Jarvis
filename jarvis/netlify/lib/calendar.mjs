// Legge TUTTI i calendari iCloud di Tommy (dentista, allenamenti, MF Agency...)
// con la password specifica per app. Solo lettura.
import { createDAVClient } from 'tsdav';
import ical from 'node-ical';

export function espandi(ev, from, to, cal) {
  if (!ev.start) return [];
  const allDay = ev.datetype === 'date';
  const dur = ev.end ? ev.end - ev.start : 3600000;
  const base = {
    titolo: (ev.summary || '(senza titolo)').toString(),
    luogo: (ev.location || '').toString(),
    allDay, cal, uid: ev.uid,
  };
  const dentro = (s) => s < to && new Date(s.getTime() + dur) > from;

  if (!ev.rrule) {
    return dentro(ev.start) ? [{ ...base, start: ev.start, end: new Date(ev.start.getTime() + dur) }] : [];
  }
  // Eventi ricorrenti (es. allenamento ogni martedì)
  const esclusi = new Set(Object.values(ev.exdate || {}).map((d) => new Date(d).getTime()));
  const modifiche = Object.values(ev.recurrences || {});
  const out = [];
  for (const d of ev.rrule.between(new Date(from.getTime() - dur), to, true)) {
    if (esclusi.has(d.getTime())) continue;
    const mod = modifiche.find((r) => r.recurrenceid && new Date(r.recurrenceid).getTime() === d.getTime());
    const s = mod?.start || d;
    const e = mod?.end || new Date(s.getTime() + dur);
    if (dentro(s)) out.push({ ...base, titolo: (mod?.summary || base.titolo).toString(), start: s, end: e });
  }
  return out;
}

export async function eventiTra(from, to) {
  if (!process.env.APPLE_ID || !process.env.APPLE_APP_PASSWORD) return [];
  const client = await createDAVClient({
    serverUrl: 'https://caldav.icloud.com',
    credentials: { username: process.env.APPLE_ID, password: process.env.APPLE_APP_PASSWORD },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  });
  const calendari = (await client.fetchCalendars()).filter(
    (c) => !c.components || c.components.includes('VEVENT'),
  );
  const liste = await Promise.all(calendari.map(async (cal) => {
    const nome = typeof cal.displayName === 'string' ? cal.displayName : 'Calendario';
    try {
      const objs = await client.fetchCalendarObjects({
        calendar: cal,
        timeRange: { start: from.toISOString(), end: to.toISOString() },
      });
      return objs.flatMap((o) => {
        if (!o.data) return [];
        const parsed = ical.sync.parseICS(o.data);
        return Object.values(parsed)
          .filter((ev) => ev.type === 'VEVENT' && !ev.recurrenceid)
          .flatMap((ev) => espandi(ev, from, to, nome));
      });
    } catch (e) {
      console.error('Calendario', nome, e.message);
      return [];
    }
  }));
  return liste.flat().sort((a, b) => a.start - b.start);
}
