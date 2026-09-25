import "server-only";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { enmascararCorreo, enviarCorreo, plantillaCorreo } from "@/lib/server/mail";
import { codigoOtp } from "@/lib/server/password";
import { minutosBloqueo, registrarIntento } from "@/lib/server/rate-limit";
import { enmascararCelular, enviarCodigoWhatsApp } from "@/lib/server/whatsapp";

// ============================================================
//  Verificación en dos pasos "de vez en cuando":
//  se pide un código por WhatsApp solo en un dispositivo nuevo o cuando
//  pasaron DIAS_CONFIANZA desde la última verificación en ese dispositivo.
// ============================================================

const DIAS_CONFIANZA = Number(process.env.DOS_PASOS_DIAS || 30);
const MINUTOS_CODIGO = 5;
const MAX_INTENTOS = 5;
const REGLA_ENVIOS = { max: 5, ventanaMs: 60 * 60_000, bloqueoMs: 60 * 60_000 }; // 5 códigos por hora

const sha = (v: string) => createHash("sha256").update(v).digest("hex");

export const dosPasosActivo = () => process.env.DOS_PASOS !== "desactivado";

/** ¿Hay que pedir el código en este dispositivo? */
export async function necesitaVerificacion(usuarioId: string, dispositivo: string | undefined) {
  if (!dosPasosActivo()) return false;
  if (!dispositivo || dispositivo.length < 16 || dispositivo.length > 100) return true;
  const d = await prisma.dispositivoConfiable.findUnique({
    where: { usuarioId_tokenHash: { usuarioId, tokenHash: sha(dispositivo) } },
  });
  if (!d) return true;
  const vence = d.ultimaVerificacion.getTime() + DIAS_CONFIANZA * 86_400_000;
  if (vence < Date.now()) return true;
  await prisma.dispositivoConfiable.update({ where: { id: d.id }, data: { ultimoUso: new Date() } });
  return false;
}

/**
 * Genera y envía el código (WhatsApp si hay celular, si no correo).
 * Devuelve por dónde se envió, o null si la persona no tiene cómo recibirlo.
 */
export async function enviarCodigoLogin(usuario: { id: string; fiel: { nombre: string; celular: string | null; correo: string | null } }) {
  const clave = `2fa:envio:${usuario.id}`;
  const espera = minutosBloqueo(clave);
  if (espera) throw new Error(`Ya pediste varios códigos. Intenta de nuevo en ${espera} min.`);

  const codigo = codigoOtp();
  await prisma.$transaction([
    prisma.otpCode.updateMany({ where: { usuarioId: usuario.id, proposito: "LOGIN_2FA", usedAt: null }, data: { usedAt: new Date() } }),
    prisma.otpCode.create({
      data: { usuarioId: usuario.id, proposito: "LOGIN_2FA", codeHash: sha(codigo), expiresAt: new Date(Date.now() + MINUTOS_CODIGO * 60_000) },
    }),
  ]);

  const { celular, correo } = usuario.fiel;
  if (celular && (await enviarCodigoWhatsApp(celular, codigo))) {
    registrarIntento(clave, REGLA_ENVIOS);
    return { canal: "WhatsApp", destino: enmascararCelular(celular) };
  }
  if (correo) {
    await enviarCorreo({
      to: correo,
      tipo: "2fa",
      subject: "Código para iniciar sesión — Espacio de estudio",
      html: plantillaCorreo(
        "Código de verificación",
        `<p>Tu código para iniciar sesión es:</p>
         <p style="font-size:34px;font-weight:800;letter-spacing:10px;color:#4f46e5;font-family:monospace;text-align:center;">${codigo}</p>
         <p>Vence en ${MINUTOS_CODIGO} minutos. Si no fuiste tú, cambia tu contraseña.</p>`,
      ),
    });
    registrarIntento(clave, REGLA_ENVIOS);
    return { canal: "correo", destino: enmascararCorreo(correo) };
  }
  return null;
}

export async function verificarCodigoLogin(usuarioId: string, codigo: string) {
  const otp = await prisma.otpCode.findFirst({
    where: { usuarioId, proposito: "LOGIN_2FA", usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.intentos >= MAX_INTENTOS) return false;
  if (otp.codeHash !== sha(codigo.trim())) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { intentos: { increment: 1 } } });
    return false;
  }
  await prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
  return true;
}

/** Marca el dispositivo como confiable por DIAS_CONFIANZA días. */
export async function confiarDispositivo(usuarioId: string, dispositivo: string | undefined, userAgent: string | undefined) {
  if (!dispositivo || dispositivo.length < 16 || dispositivo.length > 100) return;
  const tokenHash = sha(dispositivo);
  const nombre = describirNavegador(userAgent);
  await prisma.dispositivoConfiable.upsert({
    where: { usuarioId_tokenHash: { usuarioId, tokenHash } },
    create: { usuarioId, tokenHash, nombre },
    update: { ultimaVerificacion: new Date(), ultimoUso: new Date(), nombre },
  });
}

function describirNavegador(ua = "") {
  const nav = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  const so = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iPhone" : /Mac OS/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
  return so ? `${nav} en ${so}` : nav;
}
