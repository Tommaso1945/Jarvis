// Jarvis legge e scrive lo stesso database di MF Agency.
// I dati dell'app stanno in /cantiere, quelli di Jarvis in /jarvis: l'app non li tocca mai.
import { createHash } from 'node:crypto';

const base = () => (process.env.FIREBASE_URL || '').trim().replace(/\/+$/, '');
const auth = () => (process.env.FIREBASE_SECRET ? `?auth=${process.env.FIREBASE_SECRET}` : '');

async function call(path, method = 'GET', body) {
  const res = await fetch(`${base()}/${path}.json${auth()}`, {
    method,
    cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Database: errore ${res.status} su ${path}`);
  return res.json();
}
export const get = (path) => call(path);
export const put = (path, data) => call(path, 'PUT', data);
export const patch = (path, data) => call(path, 'PATCH', data);
export const remove = (path) => call(path, 'DELETE');

export const hash = (s) => createHash('sha1').update(String(s)).digest('hex').slice(0, 16);

const vivi = (col) => Object.values(col || {}).filter((x) => x && typeof x === 'object' && !x.del);

export async function loadCantiere() {
  const d = (await get('cantiere')) || {};
  return {
    prospects: vivi(d.prospects),
    fin: vivi(d.fin),
    events: vivi(d.events),
    cfg: { goal: 3000, ...(d.cfg || {}) },
  };
}

// Scrittura compatibile con la sincronizzazione dell'app: vince sempre l'upd più recente
export async function salva(col, id, data) {
  const doc = { ...data, id, upd: Date.now() };
  await put(`cantiere/${col}/${id}`, doc);
  return doc;
}

export const nuovoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// Segna un'azione come fatta. Restituisce false se era già stata fatta.
export async function once(key) {
  const k = hash(key);
  if (await get(`jarvis/sent/${k}`)) return false;
  await put(`jarvis/sent/${k}`, { key, t: Date.now() });
  return true;
}
