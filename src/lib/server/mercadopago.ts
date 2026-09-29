import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

// ============================================================
//  Mercado Pago (Checkout Pro) por su API REST.
//  Variables en .env:
//    MERCADOPAGO_ACCESS_TOKEN    credencial de la cuenta (APP_USR-… en producción, TEST-… en pruebas)
//    MERCADOPAGO_WEBHOOK_SECRET  "clave secreta" de las notificaciones (Webhooks) para validar la firma
//  Sin token, el pago se simula en desarrollo (nunca en producción).
// ============================================================

const API = "https://api.mercadopago.com";

export const mercadoPagoConfigurado = () => !!process.env.MERCADOPAGO_ACCESS_TOKEN;
export const simulacionPermitida = () => !mercadoPagoConfigurado() && process.env.NODE_ENV !== "production";
const esPrueba = () => (process.env.MERCADOPAGO_ACCESS_TOKEN ?? "").startsWith("TEST-");

async function mp<T>(ruta: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${ruta}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const texto = await res.text();
  if (!res.ok) {
    console.error("[mercadopago]", res.status, texto);
    let msg = `Mercado Pago respondió ${res.status}`;
    try {
      msg = (JSON.parse(texto) as { message?: string }).message ?? msg;
    } catch {}
    throw new Error(msg);
  }
  return JSON.parse(texto) as T;
}

export type Preferencia = { id: string; init_point: string; sandbox_init_point: string };

export async function crearPreferencia(datos: {
  referencia: string; // id de la inscripción
  titulo: string;
  codigoCurso: string;
  monto: number;
  pagador: { nombre: string; apellido: string; correo: string | null };
  urlRetorno: string;
  urlNotificacion: string;
  idempotencia: string;
}) {
  const https = (u: string) => u.startsWith("https://");
  const pref = await mp<Preferencia>("/checkout/preferences", {
    method: "POST",
    headers: { "X-Idempotency-Key": datos.idempotencia },
    body: JSON.stringify({
      items: [
        {
          id: datos.codigoCurso,
          title: datos.titulo.slice(0, 250),
          quantity: 1,
          currency_id: "COP",
          unit_price: Math.round(datos.monto),
        },
      ],
      payer: { name: datos.pagador.nombre, surname: datos.pagador.apellido, ...(datos.pagador.correo ? { email: datos.pagador.correo } : {}) },
      external_reference: datos.referencia,
      back_urls: { success: datos.urlRetorno, pending: datos.urlRetorno, failure: datos.urlRetorno },
      // Mercado Pago no acepta estas opciones con direcciones locales (http://localhost)
      ...(https(datos.urlRetorno) ? { auto_return: "approved" } : {}),
      ...(https(datos.urlNotificacion) ? { notification_url: datos.urlNotificacion } : {}),
      statement_descriptor: "ICC SANTA FE",
      expires: true,
      expiration_date_to: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    }),
  });
  return { id: pref.id, url: esPrueba() ? pref.sandbox_init_point || pref.init_point : pref.init_point };
}

export type PagoMP = {
  id: number;
  status: string; // approved | pending | in_process | rejected | cancelled | refunded | charged_back
  status_detail: string;
  external_reference: string | null;
  transaction_amount: number;
  currency_id: string;
  payment_type_id: string;
  date_approved: string | null;
};

export function obtenerPago(id: string) {
  if (!/^\d+$/.test(id)) throw new Error("Identificador de pago inválido");
  return mp<PagoMP>(`/v1/payments/${id}`);
}

/**
 * Valida la firma de un webhook (encabezado x-signature: "ts=…,v1=…").
 * Plantilla oficial: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 * Sin MERCADOPAGO_WEBHOOK_SECRET no se valida (el pago igual se verifica consultando la API).
 */
export function firmaWebhookValida(firma: string | null, requestId: string | null, dataId: string) {
  const secreto = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secreto) return true;
  if (!firma) return false;
  const partes = Object.fromEntries(firma.split(",").map((p) => p.trim().split("=") as [string, string]));
  if (!partes.ts || !partes.v1) return false;
  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifiesto = `id:${id};${requestId ? `request-id:${requestId};` : ""}ts:${partes.ts};`;
  const esperado = Buffer.from(createHmac("sha256", secreto).update(manifiesto).digest("hex"));
  const recibido = Buffer.from(partes.v1);
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
}
