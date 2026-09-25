import "server-only";

// ============================================================
//  Envío de códigos por WhatsApp (API oficial de Meta: WhatsApp Cloud API).
//  Variables en .env:
//    WHATSAPP_TOKEN       token de acceso de la app de Meta
//    WHATSAPP_PHONE_ID    ID del número de WhatsApp Business
//    WHATSAPP_PLANTILLA   plantilla de autenticación aprobada (categoría "Authentication")
//    WHATSAPP_IDIOMA      idioma de la plantilla (por defecto "es")
//    WHATSAPP_PAIS        indicativo para celulares sin él (por defecto 57, Colombia)
//  Sin WHATSAPP_TOKEN el código se imprime en la consola del servidor (modo local).
// ============================================================

/** "301 483 9591" → "573014839591" */
export function normalizarCelular(celular: string) {
  let n = celular.replace(/\D/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  const pais = process.env.WHATSAPP_PAIS || "57";
  if (n.length === 10) n = pais + n; // número nacional
  return n.length >= 11 && n.length <= 15 ? n : null;
}

export function enmascararCelular(celular: string) {
  const n = celular.replace(/\D/g, "");
  return `***${n.slice(-4)}`;
}

/** Envía el código con la plantilla de autenticación. Devuelve false si falló. */
export async function enviarCodigoWhatsApp(celular: string, codigo: string) {
  const numero = normalizarCelular(celular);
  if (!numero) return false;

  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    console.info(`\n[whatsapp] Para: +${numero}\nTu código de verificación es ${codigo}. Vence en 5 minutos.\n`);
    return true;
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: numero,
        type: "template",
        template: {
          name: process.env.WHATSAPP_PLANTILLA || "codigo_verificacion",
          language: { code: process.env.WHATSAPP_IDIOMA || "es" },
          components: [
            { type: "body", parameters: [{ type: "text", text: codigo }] },
            // Las plantillas de autenticación llevan un botón "Copiar código"
            { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: codigo }] },
          ],
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("[whatsapp] error", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("[whatsapp] error", e);
    return false;
  }
}
