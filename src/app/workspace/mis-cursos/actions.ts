"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { runAction } from "@/lib/server/action";
import { ErrorNegocio } from "@/lib/server/errors";
import { requireUser } from "@/lib/server/session";
import { carpetaFiel, guardarArchivo, leerUpload, limpiarNombre } from "@/lib/server/storage";
import { registrarNota } from "@/server/academico";
import { calificar } from "@/server/examenes";

async function matriculaDe(fielId: string, actividadId: string) {
  const actividad = await prisma.actividad.findUniqueOrThrow({ where: { id: actividadId }, include: { curso: true } });
  const matricula = await prisma.matricula.findUnique({
    where: { fielId_cursoId: { fielId, cursoId: actividad.cursoId } },
    include: { fiel: true },
  });
  if (!matricula) throw new ErrorNegocio("No estás inscrito en este curso.");
  if (matricula.estado === "RETIRADO") throw new ErrorNegocio("Tu matrícula en este curso no está activa.");
  return { actividad, matricula };
}

/** Antes subirTarea(): guarda el PDF en la carpeta del fiel y crea la entrega. */
export async function subirTarea(actividadId: string, fd: FormData) {
  return runAction(async () => {
    const user = await requireUser();
    const { actividad, matricula } = await matriculaDe(user.fielId, actividadId);
    if (actividad.tipo !== "TAREA") throw new ErrorNegocio("Esta actividad no recibe archivos.");
    const pendiente = await prisma.entrega.findFirst({ where: { matriculaId: matricula.id, actividadId, estado: "ENVIADA" } });
    if (pendiente) throw new ErrorNegocio("Ya tienes una entrega pendiente de revisión para esta tarea.");

    const { nombre, buffer } = await leerUpload(fd.get("archivo"), {
      tipos: ["application/pdf"],
      maxMB: 10,
      etiqueta: "tu tarea en PDF",
    });
    const sello = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const ruta = await guardarArchivo(
      `${carpetaFiel(matricula.fiel)}/cursos/${limpiarNombre(actividad.curso.codigo)}/${actividad.codigo}_${sello}.pdf`,
      buffer,
    );
    await prisma.entrega.create({
      data: { matriculaId: matricula.id, fielId: user.fielId, actividadId, archivoPath: ruta, archivoNombre: nombre },
    });
    revalidatePath(`/workspace/mis-cursos/${actividad.cursoId}`);
    return null;
  });
}

/** Antes calificarExamenEstudiante(): califica automáticamente y registra la nota. */
export async function presentarExamen(actividadId: string, respuestas: Record<string, string>) {
  return runAction(async () => {
    const user = await requireUser();
    const { actividad, matricula } = await matriculaDe(user.fielId, actividadId);
    if (actividad.tipo !== "EXAMEN") throw new ErrorNegocio("Esta actividad no es un examen.");

    const preguntas = await prisma.pregunta.findMany({
      where: { cursoId: actividad.cursoId, nivel: actividad.nivel, OR: [{ actividadId }, { actividadId: null }] },
    });
    if (preguntas.length === 0) throw new ErrorNegocio("Este examen todavía no tiene preguntas.");
    if (preguntas.some((p) => !(respuestas[p.id] ?? "").trim())) throw new ErrorNegocio("Responde todas las preguntas.");

    const r = calificar(preguntas, respuestas);
    const intento = await prisma.intentoExamen.create({
      data: {
        matriculaId: matricula.id,
        fielId: user.fielId,
        actividadId,
        detalle: r.detalle,
        puntosObtenidos: r.obtenidos,
        puntosTotal: r.total,
        notaAutomatica: r.nota,
      },
    });
    await registrarNota({
      matriculaId: matricula.id,
      fielId: user.fielId,
      actividadId,
      nota: r.nota,
      intentoExamenId: intento.id,
    });
    revalidatePath(`/workspace/mis-cursos/${actividad.cursoId}`);
    return { nota: r.nota, obtenidos: r.obtenidos, total: r.total, aprobado: r.aprobado };
  });
}
