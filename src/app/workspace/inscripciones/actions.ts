"use server";

import { EstadoPago, MetodoPago } from "@prisma/client";
import path from "path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { runAction } from "@/lib/server/action";
import { formObj, zNumero, zTexto } from "@/lib/server/form";
import { requireUser } from "@/lib/server/session";
import { carpetaFiel, guardarArchivo, leerUpload } from "@/lib/server/storage";
import { exigirPuedeInscribirse, inscribirEnCurso } from "@/server/academico";
import { nuevoCodigo } from "@/server/codigos";

const pagoSchema = z.object({
  costoTotal: zNumero("Costo inválido").min(0),
  montoPagado: zNumero("Monto inválido").min(0),
  estadoPago: z.enum(EstadoPago),
  metodoPago: z.preprocess((v) => (v === "" ? null : v), z.enum(MetodoPago).nullable()),
});

const nuevaSchema = pagoSchema.extend({
  fielId: zTexto("Selecciona el fiel"),
  cursoId: zTexto("Selecciona el curso"),
});

const habilitaCurso = (estado: EstadoPago) => estado === "COMPLETADO" || estado === "EXENTO";

async function guardarComprobante(fd: FormData, inscripcionId: string) {
  const file = fd.get("comprobante");
  if (!file || typeof file === "string" || file.size === 0) return;
  const { nombre, buffer } = await leerUpload(file, {
    tipos: ["application/pdf", "image/png", "image/jpeg"],
    maxMB: 10,
    etiqueta: "el comprobante",
  });
  const i = await prisma.inscripcion.findUniqueOrThrow({ where: { id: inscripcionId }, include: { fiel: true } });
  const ruta = await guardarArchivo(
    `${carpetaFiel(i.fiel)}/pagos/${i.codigo}${path.extname(nombre) || ".pdf"}`,
    buffer,
  );
  await prisma.inscripcion.update({ where: { id: i.id }, data: { comprobantePath: ruta } });
}

export async function crearInscripcion(fd: FormData) {
  return runAction(async () => {
    const user = await requireUser(R.ADMIN);
    const d = nuevaSchema.parse(formObj(fd));
    await exigirPuedeInscribirse(d.fielId, d.cursoId);
    const insc = await prisma.inscripcion.create({
      data: { ...d, codigo: nuevoCodigo("INS"), registradoPorId: user.fielId },
    });
    await guardarComprobante(fd, insc.id);
    let matriculado = false;
    if (habilitaCurso(d.estadoPago)) matriculado = !(await inscribirEnCurso(d.fielId, d.cursoId)).yaInscrito;
    revalidatePath("/workspace/inscripciones");
    return { matriculado };
  });
}

export async function actualizarPago(id: string, fd: FormData) {
  return runAction(async () => {
    await requireUser(R.ADMIN);
    const d = pagoSchema.parse(formObj(fd));
    const insc = await prisma.inscripcion.update({ where: { id }, data: d });
    await guardarComprobante(fd, insc.id);
    if (habilitaCurso(d.estadoPago)) await inscribirEnCurso(insc.fielId, insc.cursoId);
    revalidatePath("/workspace/inscripciones");
    return null;
  });
}

/** Antes repararInscripcionesPendientes(): matricula pagos completos que no quedaron inscritos. */
export async function repararInscripciones() {
  return runAction(async () => {
    await requireUser(R.ADMIN);
    const pagos = await prisma.inscripcion.findMany({ where: { estadoPago: { in: ["COMPLETADO", "EXENTO"] } } });
    let reparados = 0;
    for (const p of pagos) {
      if (!(await inscribirEnCurso(p.fielId, p.cursoId)).yaInscrito) reparados++;
    }
    revalidatePath("/workspace/inscripciones");
    return reparados;
  });
}
