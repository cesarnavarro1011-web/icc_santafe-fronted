import "server-only";
import type { CodigoPromocion } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ErrorNegocio } from "@/lib/server/errors";
import { urlSitio } from "@/lib/server/mail";
import { crearPreferencia, mercadoPagoConfigurado, obtenerPago, simulacionPermitida } from "@/lib/server/mercadopago";
import { exigirPuedeInscribirse, inscribirEnCurso } from "./academico";
import { nuevoCodigo } from "./codigos";
import { notificarPagoCurso } from "./notificaciones";

// ============================================================
//  Pago de cursos en línea (Mercado Pago) y códigos de promoción.
//  La matrícula se crea sola cuando Mercado Pago confirma el pago; el pago
//  siempre se verifica consultando a Mercado Pago, nunca con datos del navegador.
// ============================================================

export const normalizarCodigo = (c: string) => c.trim().toUpperCase().replace(/\s+/g, "");

/** Lanza error con un mensaje claro si el código no sirve para este curso ahora. */
export async function validarCodigo(codigo: string, cursoId: string) {
  const promo = await prisma.codigoPromocion.findUnique({ where: { codigo: normalizarCodigo(codigo) } });
  const ahora = new Date();
  if (!promo || !promo.activo) throw new ErrorNegocio("Ese código de promoción no existe o no está activo.");
  if (promo.cursoId && promo.cursoId !== cursoId) throw new ErrorNegocio("Ese código no aplica para este curso.");
  if (promo.validoDesde && promo.validoDesde > ahora) throw new ErrorNegocio("Ese código todavía no está vigente.");
  if (promo.validoHasta && promo.validoHasta < ahora) throw new ErrorNegocio("Ese código ya venció.");
  if (promo.usosMax !== null && promo.usos >= promo.usosMax) throw new ErrorNegocio("Ese código ya alcanzó su límite de usos.");
  return promo;
}

export function aplicarDescuento(costo: number, promo: Pick<CodigoPromocion, "tipo" | "valor"> | null) {
  if (!promo) return 0;
  const v = Number(promo.valor);
  const d = promo.tipo === "PORCENTAJE" ? (costo * Math.min(100, Math.max(0, v))) / 100 : v;
  return Math.round(Math.min(costo, Math.max(0, d)));
}

/** Precio final de un curso para el estudiante, con o sin código. */
export async function cotizar(cursoId: string, codigo?: string | null) {
  const curso = await prisma.curso.findUniqueOrThrow({ where: { id: cursoId } });
  const costo = Math.round(Number(curso.costo));
  const promo = codigo?.trim() ? await validarCodigo(codigo, cursoId) : null;
  const descuento = aplicarDescuento(costo, promo);
  return { curso, costo, descuento, total: costo - descuento, promo };
}

/**
 * El estudiante inicia el pago de un curso. Reutiliza su inscripción pendiente si
 * ya existe. Si el total queda en $0 (código del 100 %), se matricula de una vez.
 */
export async function iniciarPago(user: { fielId: string }, cursoId: string, codigo: string | null) {
  const { curso, costo, descuento, total, promo } = await cotizar(cursoId, codigo);
  if (curso.estado !== "ACTIVO") throw new ErrorNegocio("Este curso no está disponible.");
  if (costo <= 0) throw new ErrorNegocio("Este curso es gratis: usa “Quiero inscribirme”.");

  // Reutiliza la solicitud pendiente de este curso (si existe) en lugar de crear otra
  const pendiente = await prisma.inscripcion.findFirst({
    where: { fielId: user.fielId, cursoId, estadoPago: { in: ["PENDIENTE", "ABONO"] } },
  });
  if (!pendiente) await exigirPuedeInscribirse(user.fielId, cursoId, "tu");
  else {
    const matricula = await prisma.matricula.findUnique({ where: { fielId_cursoId: { fielId: user.fielId, cursoId } } });
    if (matricula) throw new ErrorNegocio("Ya estás inscrito en este curso.");
  }

  const datos = { costoTotal: costo, descuento, codigoPromoId: promo?.id ?? null, metodoPago: "MERCADOPAGO" as const };
  const insc = pendiente
    ? await prisma.inscripcion.update({ where: { id: pendiente.id }, data: datos })
    : await prisma.inscripcion.create({
        data: { ...datos, codigo: nuevoCodigo("INS"), fielId: user.fielId, cursoId, estadoPago: "PENDIENTE", montoPagado: 0, registradoPorId: user.fielId },
      });

  if (total <= 0) {
    await confirmarInscripcion(insc.id, { estado: "EXENTO", monto: 0, pagoId: null, mpEstado: null });
    return { tipo: "gratis" as const, cursoId };
  }

  if (!mercadoPagoConfigurado()) {
    if (!simulacionPermitida()) throw new ErrorNegocio("Los pagos en línea no están disponibles por ahora. Habla con la administración.");
    return { tipo: "redirigir" as const, url: `/workspace/pagos/resultado?ins=${insc.id}&simulado=1` };
  }

  const fiel = await prisma.fiel.findUniqueOrThrow({ where: { id: user.fielId } });
  const pref = await crearPreferencia({
    referencia: insc.id,
    titulo: `Curso: ${curso.nombre}`,
    codigoCurso: curso.codigo,
    monto: total,
    pagador: { nombre: fiel.nombre, apellido: fiel.apellido, correo: fiel.correo },
    urlRetorno: urlSitio(`/workspace/pagos/resultado?ins=${insc.id}`),
    urlNotificacion: urlSitio("/api/publico/mercadopago/webhook"),
    idempotencia: `${insc.id}-${total}-${promo?.id ?? "sin"}`,
  });
  await prisma.inscripcion.update({ where: { id: insc.id }, data: { mpPreferenciaId: pref.id } });
  return { tipo: "redirigir" as const, url: pref.url };
}

/**
 * Deja la inscripción pagada: estado, monto, cuenta el uso del código, matricula y
 * avisa por correo. Es idempotente: si ya estaba completa no repite nada.
 */
async function confirmarInscripcion(inscripcionId: string, d: { estado: "COMPLETADO" | "EXENTO"; monto: number; pagoId: string | null; mpEstado: string | null }) {
  const yaCompleta = await prisma.$transaction(async (tx) => {
    // updateMany con condición de estado = operación atómica: si dos avisos llegan a la vez, solo uno la gana
    const { count } = await tx.inscripcion.updateMany({
      where: { id: inscripcionId, estadoPago: { in: ["PENDIENTE", "ABONO"] } },
      data: {
        estadoPago: d.estado,
        montoPagado: d.monto,
        metodoPago: d.estado === "EXENTO" ? "EXENTO" : "MERCADOPAGO",
        ...(d.pagoId ? { mpPagoId: d.pagoId } : {}),
        mpEstado: d.mpEstado,
      },
    });
    if (count === 0) return true;
    const i = await tx.inscripcion.findUniqueOrThrow({ where: { id: inscripcionId } });
    if (i.codigoPromoId) await tx.codigoPromocion.update({ where: { id: i.codigoPromoId }, data: { usos: { increment: 1 } } });
    return false;
  });
  if (yaCompleta) return;
  const i = await prisma.inscripcion.findUniqueOrThrow({ where: { id: inscripcionId } });
  await notificarPagoCurso(i.id, false);
  await inscribirEnCurso(i.fielId, i.cursoId);
}

/**
 * Consulta el pago en Mercado Pago y actualiza la inscripción. Lo usan el webhook y
 * la página de retorno (en local no llegan los webhooks).
 */
export async function procesarPagoMercadoPago(pagoId: string) {
  const pago = await obtenerPago(pagoId);
  const inscId = pago.external_reference;
  if (!inscId) return { estado: pago.status, inscripcionId: null };
  const i = await prisma.inscripcion.findUnique({ where: { id: inscId } });
  if (!i) return { estado: pago.status, inscripcionId: null };

  const esperado = Math.round(Number(i.costoTotal) - Number(i.descuento));
  if (pago.status === "approved") {
    if (pago.currency_id !== "COP" || Math.round(pago.transaction_amount) < esperado) {
      console.error("[pagos] monto no coincide", { pagoId, recibido: pago.transaction_amount, esperado });
      await prisma.inscripcion.update({ where: { id: i.id }, data: { mpEstado: "monto_invalido", mpPagoId: String(pago.id) } });
      return { estado: "monto_invalido", inscripcionId: i.id };
    }
    await confirmarInscripcion(i.id, { estado: "COMPLETADO", monto: pago.transaction_amount, pagoId: String(pago.id), mpEstado: pago.status });
  } else if (i.estadoPago !== "COMPLETADO") {
    await prisma.inscripcion.update({ where: { id: i.id }, data: { mpEstado: pago.status } });
  }
  return { estado: pago.status, inscripcionId: i.id };
}

/** Solo en desarrollo y sin credenciales: aprueba el pago para probar el flujo completo. */
export async function simularPagoAprobado(inscripcionId: string, fielId: string) {
  if (!simulacionPermitida()) throw new ErrorNegocio("La simulación solo está disponible en desarrollo.");
  const i = await prisma.inscripcion.findUniqueOrThrow({ where: { id: inscripcionId } });
  if (i.fielId !== fielId) throw new ErrorNegocio("Esta inscripción no es tuya.");
  await confirmarInscripcion(i.id, {
    estado: "COMPLETADO",
    monto: Number(i.costoTotal) - Number(i.descuento),
    pagoId: `SIM-${Date.now()}`,
    mpEstado: "approved (simulado)",
  });
}
