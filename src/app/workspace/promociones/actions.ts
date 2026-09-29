"use server";

import { TipoDescuento } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { runAction } from "@/lib/server/action";
import { ErrorNegocio } from "@/lib/server/errors";
import { formObj, zBool, zEnteroOpc, zNumero, zTexto, zTextoOpc } from "@/lib/server/form";
import { requireUser } from "@/lib/server/session";
import { normalizarCodigo } from "@/server/pagos";

const zFechaOpc = z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.date({ error: "Fecha inválida" }).nullable());

const schema = z.object({
  codigo: zTexto("Escribe el código")
    .transform(normalizarCodigo)
    .refine((c) => /^[A-Z0-9_-]{3,30}$/.test(c), "El código debe tener de 3 a 30 letras o números, sin espacios"),
  descripcion: zTextoOpc,
  tipo: z.enum(TipoDescuento),
  valor: zNumero("Escribe el valor del descuento").positive("El descuento debe ser mayor a 0"),
  cursoId: zTextoOpc,
  usosMax: zEnteroOpc,
  validoDesde: zFechaOpc,
  validoHasta: zFechaOpc,
  activo: zBool,
});

export async function guardarPromocion(id: string | null, fd: FormData) {
  return runAction(async () => {
    const user = await requireUser(R.ADMIN);
    const d = schema.parse(formObj(fd));
    if (d.tipo === "PORCENTAJE" && d.valor > 100) throw new ErrorNegocio("El porcentaje no puede ser mayor a 100.");
    if (d.usosMax !== null && d.usosMax !== undefined && d.usosMax < 1) throw new ErrorNegocio("El límite de usos debe ser al menos 1.");
    if (d.validoDesde && d.validoHasta && d.validoHasta <= d.validoDesde) throw new ErrorNegocio("La fecha final debe ser posterior a la inicial.");
    // "Válido hasta" incluye todo ese día (hora Colombia, UTC-5)
    const hasta = d.validoHasta ? new Date(d.validoHasta.getTime() + 29 * 3_600_000 - 1) : null;
    const desde = d.validoDesde ? new Date(d.validoDesde.getTime() + 5 * 3_600_000) : null;
    const data = { ...d, validoDesde: desde, validoHasta: hasta, cursoId: d.cursoId ?? null, usosMax: d.usosMax ?? null };
    if (id) await prisma.codigoPromocion.update({ where: { id }, data });
    else await prisma.codigoPromocion.create({ data: { ...data, creadoPorId: user.fielId } });
    revalidatePath("/workspace/promociones");
    return null;
  });
}

export async function cambiarActivoPromocion(id: string, activo: boolean) {
  return runAction(async () => {
    await requireUser(R.ADMIN);
    await prisma.codigoPromocion.update({ where: { id }, data: { activo } });
    revalidatePath("/workspace/promociones");
    return null;
  });
}

export async function eliminarPromocion(id: string) {
  return runAction(async () => {
    await requireUser(R.ADMIN);
    const p = await prisma.codigoPromocion.findUniqueOrThrow({ where: { id }, include: { _count: { select: { inscripciones: true } } } });
    if (p._count.inscripciones > 0) throw new ErrorNegocio("Este código ya se usó en inscripciones; desactívalo en lugar de eliminarlo.");
    await prisma.codigoPromocion.delete({ where: { id } });
    revalidatePath("/workspace/promociones");
    return null;
  });
}
