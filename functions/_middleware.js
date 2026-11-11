// Acceso con contraseña común (Cloudflare Pages Functions).
// La contraseña NO está en el código: se guarda en Cloudflare como variable secreta CLAVE_ACCESO
// (Settings › Variables and Secrets). Si no está puesta, nadie entra.
// El manifiesto, los iconos y el service worker quedan libres para que la app se pueda instalar.
const LIBRES = /^\/(manifest\.webmanifest|sw\.js|[^/]*\.png|iconos\/[^/]+\.png)$/;

export async function onRequest({ request, next, env }) {
  const { pathname } = new URL(request.url);
  if (LIBRES.test(pathname)) return next();
  const clave = env.CLAVE_ACCESO;
  const auth = request.headers.get('Authorization') || '';
  if (clave && auth.startsWith('Basic ')) {
    try {
      const bytes = Uint8Array.from(atob(auth.slice(6)), c => c.charCodeAt(0));
      const texto = new TextDecoder().decode(bytes);
      const pass = texto.slice(texto.indexOf(':') + 1);
      if (pass === clave) {
        const r = await next();
        const res = new Response(r.body, r);
        res.headers.set('Cache-Control', 'private, no-cache');
        return res;
      }
    } catch (e) { /* cabecera mal formada */ }
  }
  return new Response('Acceso privado. Escribe la contraseña que te han dado (el usuario puede ser cualquiera).', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Inspire & Create Studio", charset="UTF-8"', 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
