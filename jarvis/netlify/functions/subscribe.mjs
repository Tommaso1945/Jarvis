import { autorizzato, json, negato } from '../lib/auth.mjs';
import { salvaIscrizione, notifica } from '../lib/push.mjs';

export default async (req) => {
  if (req.method === 'GET') return json({ chiave: process.env.VAPID_PUBLIC || '' });
  if (!autorizzato(req)) return negato();
  const sub = await req.json();
  if (!sub?.endpoint) return json({ errore: 'Iscrizione non valida' }, 400);
  await salvaIscrizione(sub);
  await notifica('Jarvis', 'Notifiche attive, Sir. La sveglio alle 5:40.', 'test');
  return json({ ok: true });
};

export const config = { path: '/api/subscribe' };
