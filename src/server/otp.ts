import "server-only";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { ErrorNegocio } from "@/lib/server/errors";
import { enmascararCorreo, enviarCorreo, plantillaCorreo } from "@/lib/server/mail";
import { codigoOtp, hashPassword } from "@/lib/server/password";
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
  if (!usuario) throw new ErrorNegocio("El usuario o ID no existe en el sistema.");
  if (!usuario.activo) throw new ErrorNegocio("Tu cuenta está inactiva.");
  return usuario;
}

export async function solicitarOtp(identificador: string) {
  const usuario = await buscarUsuario(identificador);
  const correo = usuario.fiel.correo?.trim();
  if (!correo) throw new ErrorNegocio("No tienes un correo registrado. Pide al pastor que lo agregue a tu ficha.");

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
  return { destino: enmascararCorreo(correo) };
}

export async function verificarOtp(identificador: string, code: string, consumir: boolean) {
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

export async function restablecerConOtp(identificador: string, code: string, password: string) {
  if (password.length < 6) throw new ErrorNegocio("La contraseña debe tener al menos 6 caracteres.");
  const usuario = await verificarOtp(identificador, code, true);
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { passwordHash: await hashPassword(password), debeCambiarPassword: false },
  });
}
