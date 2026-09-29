import "server-only";
import { prisma } from "@/lib/prisma";

// ============================================================
//  Envío por WhatsApp (API oficial de Meta: WhatsApp Cloud API).
//  Los mensajes que inicia la iglesia DEBEN usar plantillas aprobadas por Meta.
//  Variables en .env:
//    WHATSAPP_TOKEN             token de acceso permanente de la app de Meta
//    WHATSAPP_PHONE_ID          ID del número de WhatsApp Business
//    WHATSAPP_PLANTILLA         plantilla de categoría "Authentication" (códigos)
//    WHATSAPP_PLANTILLA_INFO    plantilla de categoría "Utility" o "Marketing" (informativos)
//                               Cuerpo con 3 variables: {{1}} nombre, {{2}} título, {{3}} mensaje
//    WHATSAPP_IDIOMA            idioma de las plantillas (por defecto "es")
//    WHATSAPP_PAIS              indicativo para celulares sin él (por defecto 57, Colombia)
//  Sin WHATSAPP_TOKEN los mensajes se imprimen en la consola del servidor (modo local).
// ============================================================

const API = "https://graph.facebook.com/v21.0";

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

export const whatsappConfigurado = () => !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);

/**
 * Meta no acepta saltos de línea, tabulaciones ni más de 4 espacios seguidos en las
 * variables de una plantilla, y las limita a ~1024 caracteres.
 */
export function limpiarVariable(texto: string, max = 1000) {
  const t = texto.replace(/\r?\n+/g, " · ").replace(/\t/g, " ").replace(/ {4,}/g, "   ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

type Resultado = { ok: true } | { ok: false; error: string };

/** Envía una plantilla aprobada. `componentes` sigue el formato de la API de Meta. */
export async function enviarPlantillaWhatsApp(celular: string, plantilla: string, componentes: unknown[], tipo: string): Promise<Resultado> {
  const numero = normalizarCelular(celular);
  if (!numero) return { ok: false, error: "Número de celular inválido" };

  if (!whatsappConfigurado()) {
    console.info(`\n[whatsapp:${tipo}] Para: +${numero} · plantilla "${plantilla}"\n${JSON.stringify(componentes)}\n`);
    return { ok: true };
  }

  try {
    const res = await fetch(`${API}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: numero,
        type: "template",
        template: { name: plantilla, language: { code: process.env.WHATSAPP_IDIOMA || "es" }, components: componentes },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const cuerpo = await res.text();
      let error = `HTTP ${res.status}`;
      try {
        error = (JSON.parse(cuerpo) as { error?: { message?: string } }).error?.message ?? error;
      } catch {}
      console.error("[whatsapp] error", res.status, cuerpo);
      await prisma.logEnvio.create({ data: { destino: numero, asunto: plantilla, tipo: `whatsapp:${tipo}`, error } }).catch(() => {});
      return { ok: false, error };
    }
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[whatsapp] error", e);
    await prisma.logEnvio.create({ data: { destino: numero, asunto: plantilla, tipo: `whatsapp:${tipo}`, error } }).catch(() => {});
    return { ok: false, error };
  }
}

/** Código de verificación (plantilla de autenticación con botón "Copiar código"). */
export async function enviarCodigoWhatsApp(celular: string, codigo: string, tipo = "codigo") {
  const r = await enviarPlantillaWhatsApp(
    celular,
    process.env.WHATSAPP_PLANTILLA || "codigo_verificacion",
    [
      { type: "body", parameters: [{ type: "text", text: codigo }] },
      { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: codigo }] },
    ],
    tipo,
  );
  return r.ok;
}

/** Aviso informativo: plantilla con {{1}} nombre, {{2}} título y {{3}} mensaje. */
export function enviarInformativoWhatsApp(celular: string, datos: { nombre: string; titulo: string; mensaje: string }) {
  return enviarPlantillaWhatsApp(
    celular,
    process.env.WHATSAPP_PLANTILLA_INFO || "aviso_informativo",
    [
      {
        type: "body",
        parameters: [
          { type: "text", text: limpiarVariable(datos.nombre, 60) || "hermano(a)" },
          { type: "text", text: limpiarVariable(datos.titulo, 120) },
          { type: "text", text: limpiarVariable(datos.mensaje, 900) },
        ],
      },
    ],
    "informativo",
  );
}
