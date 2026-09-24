import "server-only";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { NOMBRE_IGLESIA } from "@/lib/config";

type Correo = {
  to: string;
  subject: string;
  html: string;
  tipo: string;
  attachments?: { filename: string; content: Buffer }[];
};

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

/**
 * Envía un correo (reemplaza MailApp). Sin SMTP configurado lo imprime en la
 * consola, útil para trabajar 100% local. Nunca lanza: si falla, queda en LogEnvio.
 */
export async function enviarCorreo({ to, subject, html, tipo, attachments }: Correo) {
  const t = getTransporter();
  if (!t) {
    console.info(`\n[correo:${tipo}] Para: ${to}\nAsunto: ${subject}\n${html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}\n`);
    return true;
  }
  try {
    await t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, html, attachments });
    return true;
  } catch (e) {
    console.error("[correo] error", e);
    await prisma.logEnvio.create({
      data: { destino: to, asunto: subject, tipo, error: e instanceof Error ? e.message : String(e) },
    });
    return false;
  }
}

export function plantillaCorreo(titulo: string, cuerpo: string) {
  return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;">
    <div style="background:#1e293b;padding:24px;text-align:center;border-radius:12px 12px 0 0;">
      <h1 style="color:#fff;margin:0;font-size:18px;">${NOMBRE_IGLESIA}</h1>
      <p style="color:#94a3b8;margin:4px 0 0;font-size:12px;">Espacio de estudio</p>
    </div>
    <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
      <h2 style="color:#0f172a;font-size:16px;margin:0 0 12px;">${titulo}</h2>
      <div style="color:#475569;font-size:14px;line-height:1.6;">${cuerpo}</div>
    </div>
  </div>`;
}

export function enmascararCorreo(correo: string) {
  return correo.replace(/^(.{2})(.*)(@.+)$/, (_, a: string, b: string, c: string) => a + "*".repeat(b.length) + c);
}
