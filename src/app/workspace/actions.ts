"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { runAction } from "@/lib/server/action";
import { ErrorNegocio } from "@/lib/server/errors";
import { requireUser } from "@/lib/server/session";
import { exigirPuedeInscribirse } from "@/server/academico";
import { nuevoCodigo } from "@/server/codigos";

/**
 * El estudiante pide inscribirse en un curso desde Inicio. Queda como inscripción
 * PENDIENTE en "Inscripciones y pagos"; al registrar el pago (o marcarla exenta)
 * el pastor lo matricula.
 */
export async function solicitarInscripcion(cursoId: string) {
  return runAction(async () => {
    const user = await requireUser();
    const curso = await prisma.curso.findUniqueOrThrow({ where: { id: cursoId } });
    if (curso.estado !== "ACTIVO") throw new ErrorNegocio("Este curso no está disponible.");

    await exigirPuedeInscribirse(user.fielId, cursoId, "tu");

    await prisma.inscripcion.create({
      data: {
        codigo: nuevoCodigo("INS"),
        fielId: user.fielId,
        cursoId,
        costoTotal: curso.costo,
        montoPagado: 0,
        estadoPago: "PENDIENTE",
        registradoPorId: user.fielId,
      },
    });
    revalidatePath("/workspace");
    revalidatePath("/workspace/inscripciones");
    return null;
  });
}
