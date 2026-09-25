"use server";

import { TipoServicio } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { runAction } from "@/lib/server/action";
import { ErrorNegocio } from "@/lib/server/errors";
import { formObj, zFechaOpc, zTextoOpc } from "@/lib/server/form";
import { requireUser } from "@/lib/server/session";
import { exigirTurno, hoyISO } from "@/server/turnos";

function fechaServicio(fecha: Date | null | undefined) {
  if (!fecha) return new Date();
  // input date → mediodía para que no cambie de día por zona horaria
  const d = new Date(fecha);
  d.setUTCHours(17, 0, 0, 0);
  return d;
}

const individualSchema = z.object({
  fielId: zTextoOpc,
  nombreInvitado: zTextoOpc,
  servicio: z.enum(TipoServicio),
  fecha: zFechaOpc,
});

export async function registrarAsistencia(fd: FormData) {
  return runAction(async () => {
    const user = await requireUser(R.ASISTENCIA_IGLESIA);
    const d = individualSchema.parse(formObj(fd));
    await exigirTurno(user, d.fecha ? d.fecha.toISOString().slice(0, 10) : hoyISO());
    if (!d.fielId && !d.nombreInvitado) throw new ErrorNegocio("Selecciona un fiel o escribe el nombre del invitado.");
    await prisma.asistenciaCongregacional.create({
      data: {
        fielId: d.fielId ?? null,
        nombreInvitado: d.fielId ? null : d.nombreInvitado,
        servicio: d.servicio,
        fecha: fechaServicio(d.fecha),
        registradoPorId: user.fielId,
      },
    });
    revalidatePath("/workspace/asistencia");
    return null;
  });
}

export async function registrarAsistenciaMasiva(fielIds: string[], servicio: TipoServicio, fecha: string, invitados: number) {
  return runAction(async () => {
    const user = await requireUser(R.ASISTENCIA_IGLESIA);
    await exigirTurno(user, fecha || hoyISO());
    if (fielIds.length === 0 && invitados <= 0) throw new ErrorNegocio("Marca al menos un asistente.");
    const f = fechaServicio(fecha ? new Date(fecha) : null);
    const filas = [
      ...fielIds.map((fielId) => ({ fielId, servicio, fecha: f, registradoPorId: user.fielId })),
      ...Array.from({ length: Math.max(0, Math.min(invitados, 500)) }, () => ({
        fielId: null,
        nombreInvitado: "Invitado",
        servicio,
        fecha: f,
        registradoPorId: user.fielId,
      })),
    ];
    const { count } = await prisma.asistenciaCongregacional.createMany({ data: filas });
    revalidatePath("/workspace/asistencia");
    return count;
  });
}

/** Superadmin, o quien lo registró mientras su grupo siga de turno esa semana. */
export async function eliminarAsistencia(id: string) {
  return runAction(async () => {
    const user = await requireUser(R.ASISTENCIA_IGLESIA);
    const registro = await prisma.asistenciaCongregacional.findUniqueOrThrow({ where: { id } });
    if (user.rol !== "SUPERADMIN") {
      if (registro.registradoPorId !== user.fielId) throw new ErrorNegocio("Solo puedes eliminar registros que hiciste tú.");
      await exigirTurno(user, registro.fecha.toISOString().slice(0, 10));
    }
    await prisma.asistenciaCongregacional.delete({ where: { id } });
    revalidatePath("/workspace/asistencia");
    return null;
  });
}
