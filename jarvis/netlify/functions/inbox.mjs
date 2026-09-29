import { autorizzato, json, negato } from '../lib/auth.mjs';
import { get } from '../lib/db.mjs';

export default async (req) => {
  if (!autorizzato(req)) return negato();
  const dopo = Number(new URL(req.url).searchParams.get('dopo')) || 0;
  const tutti = Object.values((await get('jarvis/inbox')) || {});
  return json(tutti.filter((m) => m.t > dopo).sort((a, b) => a.t - b.t).slice(-20));
};

export const config = { path: '/api/inbox' };
