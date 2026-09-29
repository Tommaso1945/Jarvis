// Solo chi conosce il PIN può parlare con Jarvis
export function autorizzato(req) {
  const pin = process.env.JARVIS_PIN;
  return Boolean(pin) && req.headers.get('x-jarvis-pin') === pin;
}
export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
export const negato = () => json({ errore: 'PIN errato' }, 401);
