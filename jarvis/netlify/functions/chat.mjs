import { TOOLS, eseguiTool } from '../lib/tools.mjs';
import { autorizzato, json, negato } from '../lib/auth.mjs';
import { rome } from '../lib/time.mjs';
import { LISTINO, CALL_PLAN, OWNER } from '../lib/config.mjs';

function sistema() {
  const r = rome();
  const listino = Object.entries(LISTINO)
    .map(([k, v]) => `${v.nome} (${k}): ${v.prezzo} euro${v.trattabile ? ', trattabile' : ', NON trattabile'}${v.target ? `, obiettivo realistico ${v.target.join('-')} euro` : ''}`)
    .join('; ');
  return `Sei Jarvis, l'assistente personale di ${OWNER.nome} per MF Agency, agenzia di siti web nel Golfo del Tigullio che gestisce con il socio ${OWNER.socio}.
Ti rivolgi a lui come "Sir" o "Capo". Tono da maggiordomo inglese in italiano: asciutto, preciso, con un filo di ironia.
Adesso è ${r.esteso}, ore ${r.ora} (Italia). Oggi in formato data: ${r.date}.

Regole:
- Le tue risposte vengono lette ad alta voce: niente markdown, niente elenchi con simboli, niente emoji. Frasi brevi. Massimo 4 frasi, a meno che Tommy chieda una lista.
- I numeri li prendi SEMPRE dagli strumenti. Non inventare mai dati. Se un dato non c'è, dillo.
- Owner: T = Tommy, A = Alessandro. Se Tommy non specifica, i nuovi contatti sono suoi.
- Listino: ${listino}. Il valore di una trattativa è il prezzo trattato se c'è, altrimenti il listino.
- Giornate chiamate: martedì, mercoledì e giovedì dalle ${CALL_PLAN.from} alle ${CALL_PLAN.to}, ${CALL_PLAN.perPersona} chiamate a testa.
- Prima di modificare un contatto trovalo con cerca_lead. Dopo ogni modifica conferma in una frase cosa hai fatto.
- Date relative ("giovedì", "domani") convertile tu in YYYY-MM-DD partendo da oggi.
- Se Tommy è indietro sulle chiamate o sull'obiettivo, faglielo notare con garbo ma senza sconti.
- Ti occupi solo di lavoro e agenda. Per altro, rispondi brevemente e riporta la conversazione al lavoro.`;
}

async function claude(messages) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.JARVIS_MODEL || 'claude-sonnet-5-5',
      max_tokens: 1024,
      system: sistema(),
      tools: TOOLS,
      messages,
    }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);
  return res.json();
}

export default async (req) => {
  if (req.method !== 'POST') return json({ errore: 'Solo POST' }, 405);
  if (!autorizzato(req)) return negato();

  const { storia = [] } = await req.json();
  const messages = storia
    .filter((m) => m && typeof m.testo === 'string' && m.testo.trim())
    .slice(-12)
    .map((m) => ({ role: m.da === 'io' ? 'user' : 'assistant', content: m.testo }));
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (!messages.length) return json({ errore: 'Messaggio vuoto' }, 400);

  try {
    for (let giro = 0; giro < 8; giro++) {
      const out = await claude(messages);
      if (out.stop_reason !== 'tool_use') {
        const testo = out.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
        return json({ testo: testo || 'Fatto, Sir.' });
      }
      messages.push({ role: 'assistant', content: out.content });
      const risultati = [];
      for (const b of out.content.filter((x) => x.type === 'tool_use')) {
        let esito;
        try { esito = await eseguiTool(b.name, b.input || {}); }
        catch (e) { esito = { errore: e.message }; }
        risultati.push({ type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(esito) });
      }
      messages.push({ role: 'user', content: risultati });
    }
    return json({ testo: 'Sir, la richiesta è più lunga del previsto. Me la divida in due passaggi.' });
  } catch (e) {
    console.error(e);
    return json({ errore: e.message }, 500);
  }
};

export const config = { path: '/api/chat' };
