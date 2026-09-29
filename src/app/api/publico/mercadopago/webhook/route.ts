import { NextResponse } from "next/server";
import { firmaWebhookValida } from "@/lib/server/mercadopago";
import { procesarPagoMercadoPago } from "@/server/pagos";

// Notificaciones de Mercado Pago (Webhooks). Configurar en el panel de Mercado Pago:
//   URL: https://<tu-dominio>/api/publico/mercadopago/webhook   ·  Evento: Pagos
// Mercado Pago reintenta si no recibe 200, así que siempre se responde 200 salvo firma inválida.

export async function POST(req: Request) {
  const url = new URL(req.url);
  const body = (await req.json().catch(() => ({}))) as { type?: string; action?: string; data?: { id?: string | number } };
  const tipo = body.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const dataId = String(body.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");

  if (tipo !== "payment" || !/^\d+$/.test(dataId)) return NextResponse.json({ ok: true, ignorado: true });

  if (!firmaWebhookValida(req.headers.get("x-signature"), req.headers.get("x-request-id"), dataId)) {
    console.warn("[mercadopago] webhook con firma inválida", dataId);
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const r = await procesarPagoMercadoPago(dataId);
    return NextResponse.json({ ok: true, estado: r.estado });
  } catch (e) {
    console.error("[mercadopago] error procesando webhook", dataId, e);
    return NextResponse.json({ ok: false }, { status: 500 }); // Mercado Pago lo reintentará
  }
}
