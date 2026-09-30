import "server-only";
import { prisma } from "@/lib/prisma";
import { enviarCorreo, esc, plantillaCorreo, urlSitio } from "@/lib/server/mail";
import { normalizarCelular } from "@/lib/server/whatsapp";

// ============================================================
//  Avisos a la iglesia cuando un visitante escribe desde la página
//  (Contáctanos y peticiones de oración). Sin costo:
//
//  · WhatsApp con CallMeBot (https://www.callmebot.com): servicio gratuito que
//    envía mensajes de WhatsApp a TU PROPIO número. Se activa una sola vez desde
//    ese celular y te dan una apikey →  .env: CALLMEBOT_APIKEY
//    (CALLMEBOT_TELEFONO opcional; si falta se usa el WhatsApp de Datos de la iglesia).
//  · Correo de la iglesia (Datos de la iglesia → Correo), si SMTP está configurado.
//
//  Sin CALLMEBOT_APIKEY el aviso de WhatsApp se imprime en la consola del servidor.
// ============================================================

export const callmebotConfigurado = () => !!process.env.CALLMEBOT_APIKEY;

async function avisarWhatsApp(numero: string, texto: string) {
  const n = normalizarCelular(numero);
  if (!n) return false;
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!apikey) {
    console.info(`\n[aviso-whatsapp] Para: +${n}\n${texto}\n`);
    return true;
  }
  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=%2B${n}&text=${encodeURIComponent(texto)}&apikey=${encodeURIComponent(apikey)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    const cuerpo = await res.text();
    // CallMeBot responde 200 con HTML; los errores traen "ERROR" o "APIKey is invalid"
    if (!res.ok || /error|invalid/i.test(cuerpo.slice(0, 500))) throw new Error(`HTTP ${res.status}: ${cuerpo.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 200)}`);
    return true;
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[aviso-whatsapp] error", error);
    await prisma.logEnvio.create({ data: { destino: n, asunto: "aviso a la iglesia", tipo: "whatsapp:callmebot", error } }).catch(() => {});
    return false;
  }
}

/**
 * Avisa a la iglesia por WhatsApp y por correo. Devuelve true si al menos un canal funcionó.
 * `campos` se muestran como "Etiqueta: valor" (los vacíos se omiten).
 */
export async function avisarIglesia(aviso: { titulo: string; campos: [string, string | null | undefined][]; mensaje: string; ruta: string }) {
  const sitio = await prisma.webSitio.findUnique({ where: { id: "principal" }, select: { whatsapp: true, correo: true, nombre: true } });
  const campos = aviso.campos.filter((c): c is [string, string] => !!c[1]?.trim());
  const enlace = urlSitio(aviso.ruta);
  const mensaje = aviso.mensaje.length > 900 ? `${aviso.mensaje.slice(0, 900)}…` : aviso.mensaje;

  const numero = process.env.CALLMEBOT_TELEFONO || sitio?.whatsapp;
  const texto = [`*${aviso.titulo}*`, "", ...campos.map(([k, v]) => `*${k}:* ${v}`), "", mensaje, "", `Ver en el panel: ${enlace}`].join("\n");

  const [porWhatsApp, porCorreo] = await Promise.all([
    numero ? avisarWhatsApp(numero, texto) : Promise.resolve(false),
    sitio?.correo
      ? enviarCorreo({
          to: sitio.correo,
          tipo: "aviso-iglesia",
          subject: aviso.titulo,
          html: plantillaCorreo(
            aviso.titulo,
            `<table style="border-collapse:collapse;margin-bottom:12px">${campos
              .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#64748b">${esc(k)}</td><td style="padding:4px 0;font-weight:600">${esc(v)}</td></tr>`)
              .join("")}</table>
             <p style="white-space:pre-line">${esc(aviso.mensaje)}</p>`,
            { boton: { texto: "Ver en el panel", url: enlace } },
          ),
        }).then((r) => r.ok)
      : Promise.resolve(false),
  ]);
  return porWhatsApp || porCorreo;
}
