import "server-only";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { NOMBRE_IGLESIA } from "@/lib/config";

// ============================================================
//  Envío de correos (SMTP). Variables en .env:
//    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
//    NEXTAUTH_URL  → dirección del sitio para los botones de los correos
//  Sin SMTP_HOST los correos se imprimen en la consola (modo local).
// ============================================================

export type Adjunto = { filename: string; content: Buffer; cid?: string; contentType?: string };

type Correo = {
  to: string;
  subject: string;
  html: string;
  tipo: string;
  attachments?: Adjunto[];
  /** Encabezados extra (p. ej. List-Unsubscribe en los comunicados) */
  headers?: Record<string, string>;
};

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    pool: true, // reutiliza la conexión en envíos masivos
    maxConnections: 3,
  });
  return transporter;
}

export const correoConfigurado = () => !!process.env.SMTP_HOST;

/**
 * Envía un correo. Sin SMTP configurado lo imprime en la consola, útil para
 * trabajar 100 % local. Nunca lanza: si falla, queda en LogEnvio y devuelve el error.
 */
export async function enviarCorreo({ to, subject, html, tipo, attachments, headers }: Correo): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = getTransporter();
  if (!t) {
    console.info(`\n[correo:${tipo}] Para: ${to}\nAsunto: ${subject}\n${html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}\n`);
    return { ok: true };
  }
  try {
    await t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, html, attachments, headers });
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[correo] error", e);
    await prisma.logEnvio.create({ data: { destino: to, asunto: subject, tipo, error } }).catch(() => {});
    return { ok: false, error };
  }
}

/** Escapa texto que viene de usuarios antes de meterlo en el HTML de un correo. */
export function esc(v: unknown) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Dirección pública del sitio, para los enlaces de los correos. */
export function urlSitio(ruta = "/") {
  const base = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${ruta.startsWith("/") ? ruta : `/${ruta}`}`;
}

type OpcionesPlantilla = {
  /** Botón principal: { texto, url } (url relativa al sitio o absoluta) */
  boton?: { texto: string; url: string };
  /** Subtítulo bajo el nombre de la iglesia */
  subtitulo?: string;
  /** Texto del pie (p. ej. enlace para darse de baja) */
  pie?: string;
};

export function plantillaCorreo(titulo: string, cuerpo: string, opciones: OpcionesPlantilla = {}) {
  const { boton, subtitulo = "Espacio de estudio", pie } = opciones;
  const urlBoton = boton ? (/^https?:\/\//.test(boton.url) ? boton.url : urlSitio(boton.url)) : null;
  return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;">
    <div style="background:#1e293b;padding:24px;text-align:center;border-radius:12px 12px 0 0;">
      <h1 style="color:#fff;margin:0;font-size:18px;">${esc(NOMBRE_IGLESIA)}</h1>
      <p style="color:#94a3b8;margin:4px 0 0;font-size:12px;">${esc(subtitulo)}</p>
    </div>
    <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
      <h2 style="color:#0f172a;font-size:17px;margin:0 0 12px;">${titulo}</h2>
      <div style="color:#475569;font-size:14px;line-height:1.6;">${cuerpo}</div>
      ${
        urlBoton && boton
          ? `<p style="text-align:center;margin:24px 0 8px;">
               <a href="${esc(urlBoton)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:999px;">${esc(boton.texto)}</a>
             </p>`
          : ""
      }
    </div>
    <p style="color:#94a3b8;font-size:11px;text-align:center;margin:16px 8px;line-height:1.5;">
      ${pie ?? `Este es un mensaje automático de ${esc(NOMBRE_IGLESIA)}. No respondas a este correo.`}
    </p>
  </div>`;
}

/** Tabla simple "Campo: valor" para los correos (pagos, inscripciones…). */
export function tablaDatos(filas: [string, string][]) {
  return `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px;">${filas
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 8px;color:#64748b;border-bottom:1px solid #f1f5f9;">${esc(k)}</td><td style="padding:6px 8px;color:#0f172a;font-weight:600;border-bottom:1px solid #f1f5f9;text-align:right;">${esc(v)}</td></tr>`,
    )
    .join("")}</table>`;
}

export function enmascararCorreo(correo: string) {
  return correo.replace(/^(.{2})(.*)(@.+)$/, (_, a: string, b: string, c: string) => a + "*".repeat(b.length) + c);
}
