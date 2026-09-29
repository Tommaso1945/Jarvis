import webpush from 'web-push';
import { get, put, remove, hash } from './db.mjs';

let pronto = false;
function setup() {
  if (pronto) return;
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'jarvis@mfagency.it'}`,
    process.env.VAPID_PUBLIC,
    process.env.VAPID_PRIVATE,
  );
  pronto = true;
}

export async function salvaIscrizione(sub) {
  await put(`jarvis/subs/${hash(sub.endpoint)}`, sub);
}

// Manda la notifica e la salva nella casella di Jarvis, così nell'app si legge per intero
export async function notifica(titolo, testo, tag = 'jarvis') {
  setup();
  const id = Date.now().toString(36);
  await put(`jarvis/inbox/${id}`, { id, titolo, testo, t: Date.now() });
  const subs = (await get('jarvis/subs')) || {};
  await Promise.all(Object.entries(subs).map(async ([k, s]) => {
    try {
      await webpush.sendNotification(s, JSON.stringify({ titolo, testo, tag, id }), { TTL: 3600 });
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await remove(`jarvis/subs/${k}`);
      else console.error('Push', e.statusCode, e.body);
    }
  }));
}
