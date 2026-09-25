"use server";

import { MetodoPago, TipoOfrenda, TipoServicio } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { runAction } from "@/lib/server/action";
import { ErrorNegocio } from "@/lib/server/errors";
import { formObj, zNumero, zTexto, zTextoOpc } from "@/lib/server/form";
import { requireUser, type UsuarioSesion } from "@/lib/server/session";
import { hoyISO } from "@/server/turnos";

const METODOS = ["EFECTIVO", "TRANSFERENCIA", "NEQUI", "DAVIPLATA"] as const satisfies readonly MetodoPago[];

function revalidar() {
  revalidatePath("/workspace/ofrendas");
  revalidatePath("/workspace");
}

const fechaSchema = zTexto("Elige la fecha").refine((f) => /^\d{4}-\d{2}-\d{2}$/.test(f), "Fecha inválida").refine((f) => f <= hoyISO(), "La fecha no puede ser futura");

const registroSchema = z.object({
  fecha: fechaSchema,
  servicio: z.enum(TipoServicio),
  metodo: z.enum(METODOS),
  descripcion: zTextoOpc,
});

/** Lo recogido en un servicio: una fila por cada tipo con monto (diezmo, ofrenda, primicia…). */
export async function registrarRecaudo(fd: FormData) {
  return runAction(async () => {
    const user = await requireUser(R.REGISTRA_OFRENDAS);
    const d = registroSchema.parse(formObj(fd));

    const filas = (Object.keys(TipoOfrenda) as TipoOfrenda[])
      .map((tipo) => ({ tipo, monto: Number(String(fd.get(`monto_${tipo}`) ?? "").replace(/[^\d.]/g, "")) || 0 }))
      .filter((f) => f.monto > 0);
    if (filas.length === 0) throw new ErrorNegocio("Escribe al menos un monto.");
    if (filas.some((f) => f.tipo === "OTRO") && !d.descripcion) throw new ErrorNegocio("Describe qué es el monto en “Otro”.");

    const grupo = await prisma.grupo.findFirst({ where: { liderId: user.fielId, estado: "ACTIVO" }, select: { id: true } });
    await prisma.registroOfrenda.createMany({
      data: filas.map((f) => ({
        fecha: new Date(`${d.fecha}T00:00:00.000Z`),
        servicio: d.servicio,
        metodo: d.metodo,
        tipo: f.tipo,
        monto: f.monto,
        descripcion: d.descripcion,
        registradoPorId: user.fielId,
        grupoId: grupo?.id ?? null,
      })),
    });
    revalidar();
    return filas.length;
  });
}

/** Solo quien lo registró (o superadmin) y mientras el pastor no lo haya verificado. */
async function propio(user: UsuarioSesion, id: string) {
  const r = await prisma.registroOfrenda.findUniqueOrThrow({ where: { id } });
  if (user.rol !== "SUPERADMIN" && r.registradoPorId !== user.fielId) throw new ErrorNegocio("Solo puedes cambiar registros que hiciste tú.");
  if (r.estado === "VERIFICADO") throw new ErrorNegocio("Este registro ya fue verificado por el pastor; no se puede cambiar.");
  return r;
}

const edicionSchema = z.object({
  fecha: fechaSchema,
  servicio: z.enum(TipoServicio),
  tipo: z.enum(TipoOfrenda),
  metodo: z.enum(METODOS),
  monto: zNumero("Monto inválido").positive("El monto debe ser mayor a 0"),
  descripcion: zTextoOpc,
});

export async function editarRegistro(id: string, fd: FormData) {
  return runAction(async () => {
    const user = await requireUser(R.REGISTRA_OFRENDAS);
    await propio(user, id);
    const d = edicionSchema.parse(formObj(fd));
    await prisma.registroOfrenda.update({
      where: { id },
      // Al corregir vuelve a quedar pendiente de verificación
      data: { ...d, fecha: new Date(`${d.fecha}T00:00:00.000Z`), estado: "PENDIENTE" },
    });
    revalidar();
    return null;
  });
}

export async function eliminarRegistro(id: string) {
  return runAction(async () => {
    const user = await requireUser(R.REGISTRA_OFRENDAS);
    await propio(user, id);
    await prisma.registroOfrenda.delete({ where: { id } });
    revalidar();
    return null;
  });
}

// ── Control del pastor ───────────────────────────────────────

export async function verificarRegistros(ids: string[]) {
  return runAction(async () => {
    const user = await requireUser(R.VERIFICA_OFRENDAS);
    const { count } = await prisma.registroOfrenda.updateMany({
      where: { id: { in: ids }, estado: { not: "VERIFICADO" } },
      data: { estado: "VERIFICADO", verificadoPorId: user.fielId, verificadoAt: new Date(), observacion: null },
    });
    revalidar();
    return count;
  });
}

export async function observarRegistro(id: string, fd: FormData) {
  return runAction(async () => {
    const user = await requireUser(R.VERIFICA_OFRENDAS);
    const { observacion } = z.object({ observacion: zTexto("Escribe la observación") }).parse(formObj(fd));
    await prisma.registroOfrenda.update({
      where: { id },
      data: { estado: "OBSERVADO", observacion, verificadoPorId: user.fielId, verificadoAt: new Date() },
    });
    revalidar();
    return null;
  });
}
