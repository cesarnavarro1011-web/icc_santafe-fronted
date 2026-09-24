"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ACADEMICO } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { runAction } from "@/lib/server/action";
import { formObj, zNumero, zTextoOpc } from "@/lib/server/form";
import { requireUser } from "@/lib/server/session";
import { exigirCursoEnAlcance, registrarNota } from "@/server/academico";

const schema = z.object({
  nota: zNumero("Nota inválida").min(0, "Mínimo 0").max(ACADEMICO.NOTA_MAX, `Máximo ${ACADEMICO.NOTA_MAX}`),
  motivo: zTextoOpc,
});

export async function editarNotaExamen(intentoId: string, fd: FormData) {
  return runAction(async () => {
    const user = await requireUser(R.DOCENTE);
    const d = schema.parse(formObj(fd));
    const intento = await prisma.intentoExamen.findUniqueOrThrow({ where: { id: intentoId }, include: { actividad: true } });
    await exigirCursoEnAlcance(user, intento.actividad.cursoId);

    await prisma.intentoExamen.update({
      where: { id: intento.id },
      data: { notaManual: d.nota, motivoEdicion: d.motivo, editadoPorId: user.fielId },
    });
    await registrarNota({
      matriculaId: intento.matriculaId,
      fielId: intento.fielId,
      actividadId: intento.actividadId,
      nota: d.nota,
      notaMax: ACADEMICO.NOTA_MAX,
      comentario: d.motivo ? `Corrección manual: ${d.motivo}` : "Corrección manual",
      intentoExamenId: intento.id,
    });
    revalidatePath("/workspace/calificar-examenes");
    return null;
  });
}
