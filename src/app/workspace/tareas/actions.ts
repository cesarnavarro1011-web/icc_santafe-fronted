"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ACADEMICO } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { runAction } from "@/lib/server/action";
import { ErrorNegocio } from "@/lib/server/errors";
import { formObj, zTextoOpc } from "@/lib/server/form";
import { enviarCorreo, esc, plantillaCorreo } from "@/lib/server/mail";
import { requireUser } from "@/lib/server/session";
import { exigirCursoEnAlcance, recalcularMatricula, registrarNota } from "@/server/academico";

const schema = z.object({
  estado: z.enum(["APROBADA", "REPROBADA", "DEVUELTA"]),
  nota: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().nullable()),
  comentario: zTextoOpc,
});

const ETIQUETA = { APROBADA: "aprobada", REPROBADA: "reprobada", DEVUELTA: "devuelta para corrección" } as const;

export async function calificarEntrega(entregaId: string, fd: FormData) {
  return runAction(async () => {
    const user = await requireUser(R.CALIFICA);
    const d = schema.parse(formObj(fd));
    const e = await prisma.entrega.findUniqueOrThrow({ where: { id: entregaId }, include: { actividad: true, fiel: true } });
    await exigirCursoEnAlcance(user, e.actividad.cursoId);

    const max = e.actividad.notaMax || ACADEMICO.NOTA_MAX;
    if (d.estado !== "DEVUELTA") {
      if (d.nota === null) throw new ErrorNegocio("Escribe la nota.");
      if (d.nota < 0 || d.nota > max) throw new ErrorNegocio(`La nota debe estar entre 0 y ${max}.`);
      const normalizada = (d.nota / max) * ACADEMICO.NOTA_MAX;
      if (d.estado === "APROBADA" && normalizada < ACADEMICO.NOTA_MIN_APROBAR) {
        throw new ErrorNegocio(`Para aprobar se necesita mínimo ${ACADEMICO.NOTA_MIN_APROBAR}/${ACADEMICO.NOTA_MAX}.`);
      }
    }

    await prisma.entrega.update({
      where: { id: e.id },
      data: { estado: d.estado, comentario: d.comentario, revisadoPorId: user.fielId, revisadoAt: new Date() },
    });
    if (d.estado === "DEVUELTA") {
      await prisma.nota.deleteMany({ where: { entregaId: e.id } });
      await recalcularMatricula(e.matriculaId);
    } else {
      await registrarNota({
        matriculaId: e.matriculaId,
        fielId: e.fielId,
        actividadId: e.actividadId,
        nota: d.nota!,
        notaMax: max,
        comentario: d.comentario,
        entregaId: e.id,
      });
    }

    if (e.fiel.correo) {
      await enviarCorreo({
        to: e.fiel.correo,
        tipo: "calificacion",
        subject: `Calificación: ${e.actividad.nombre}`,
        html: plantillaCorreo(
          "Tu entrega fue revisada",
          `<p>Hola <strong>${esc(e.fiel.nombre)}</strong>,</p>
           <p>Tu entrega "<strong>${esc(e.actividad.nombre)}</strong>" fue <strong>${ETIQUETA[d.estado]}</strong>.</p>
           ${d.nota !== null && d.estado !== "DEVUELTA" ? `<p>Nota: <strong>${d.nota}/${max}</strong></p>` : ""}
           ${d.comentario ? `<p>Comentario: ${esc(d.comentario)}</p>` : ""}`,
        ),
      });
    }
    revalidatePath("/workspace/tareas");
    return null;
  });
}
