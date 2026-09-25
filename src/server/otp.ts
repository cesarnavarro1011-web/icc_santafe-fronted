import "server-only";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { ErrorNegocio } from "@/lib/server/errors";
import { enviarCorreo, plantillaCorreo } from "@/lib/server/mail";
import { codigoOtp, hashPassword, validarPassword } from "@/lib/server/password";
import { minutosBloqueo, registrarIntento, REGLAS } from "@/lib/server/rate-limit";
import { buscarUsuarioPor } from "@/lib/server/identificador";

// Reemplaza CacheService "OTP_CHANGE_<id>" (solicitarOtpCambioPassword / confirmarCambioPasswordConOtp)

const MINUTOS = 10;
const MAX_INTENTOS = 5;

const hashOtp = (code: string) => createHash("sha256").update(code).digest("hex");

async function buscarUsuario(identificador: string) {
  const id = identificador.trim();
  if (!id) throw new ErrorNegocio("Ingresa tu usuario, ID o correo.");
  const usuario = await prisma.usuario.findFirst({
    where: buscarUsuarioPor(id),
    include: { fiel: true },
  });
  // Mensaje genérico: no revela si el usuario existe
  if (!usuario || !usuario.activo) throw new ErrorNegocio("Código incorrecto o expirado.");
  return usuario;
}

/**
 * Envía un código si el usuario existe y tiene correo. La respuesta es la misma en
 * todos los casos para no revelar qué usuarios existen (enumeración de cuentas).
 */
export async function solicitarOtp(identificador: string, ip: string) {
  const id = identificador.trim().toLowerCase();
  if (!id) throw new ErrorNegocio("Ingresa tu usuario, documento o correo.");
  const claveU = `otp:u:${id}`;
  const esperaU = minutosBloqueo(claveU);
  if (esperaU) throw new ErrorNegocio(`Ya pediste varios códigos. Intenta de nuevo en ${esperaU} min.`);
  registrarIntento(claveU, REGLAS.otpUsuario);
  limitarIp(ip);

  const generico = { mensaje: "Si el usuario existe y tiene correo registrado, le enviamos un código de 6 dígitos." };
  const usuario = await prisma.usuario.findFirst({ where: buscarUsuarioPor(identificador), include: { fiel: true } });
  const correo = usuario?.activo ? usuario.fiel.correo?.trim() : null;
  if (!usuario || !correo) return generico;

  const code = codigoOtp();
  await prisma.$transaction([
    prisma.otpCode.updateMany({
      where: { usuarioId: usuario.id, proposito: "CAMBIO_PASSWORD", usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.otpCode.create({
      data: {
        usuarioId: usuario.id,
        proposito: "CAMBIO_PASSWORD",
        codeHash: hashOtp(code),
        expiresAt: new Date(Date.now() + MINUTOS * 60_000),
      },
    }),
  ]);

  await enviarCorreo({
    to: correo,
    tipo: "otp",
    subject: "Código de verificación — Espacio de estudio",
    html: plantillaCorreo(
      "Código de verificación",
      `<p>Usa este código para cambiar tu contraseña. <strong>Expira en ${MINUTOS} minutos.</strong></p>
       <p style="font-size:34px;font-weight:800;letter-spacing:10px;color:#4f46e5;font-family:monospace;text-align:center;">${code}</p>
       <p style="color:#94a3b8;font-size:12px;">Si no solicitaste este cambio, ignora este mensaje.</p>`,
    ),
  });
  return generico;
}

function limitarIp(ip: string) {
  const clave = `recuperacion:ip:${ip}`;
  const espera = minutosBloqueo(clave);
  if (espera) throw new ErrorNegocio(`Demasiados intentos. Intenta de nuevo en ${espera} min.`);
  registrarIntento(clave, REGLAS.recuperacionIp);
}

export async function verificarOtp(identificador: string, code: string, consumir: boolean, ip: string) {
  limitarIp(ip);
  const usuario = await buscarUsuario(identificador);
  const otp = await prisma.otpCode.findFirst({
    where: { usuarioId: usuario.id, proposito: "CAMBIO_PASSWORD", usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.intentos >= MAX_INTENTOS) throw new ErrorNegocio("Código incorrecto o expirado. Solicita uno nuevo.");
  if (otp.codeHash !== hashOtp(code.trim())) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { intentos: { increment: 1 } } });
    throw new ErrorNegocio("Código incorrecto o expirado.");
  }
  if (consumir) await prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
  return usuario;
}

export async function restablecerConOtp(identificador: string, code: string, password: string, ip: string) {
  validarPassword(password);
  const usuario = await verificarOtp(identificador, code, true, ip);
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { passwordHash: await hashPassword(password), debeCambiarPassword: false },
  });
}
