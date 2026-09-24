"use server";

import { TipoBautismo } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { runAction } from "@/lib/server/action";
import { formObj, zFecha, zTexto, zTextoOpc } from "@/lib/server/form";
import { requireUser } from "@/lib/server/session";

const schema = z.object({
  fielId: zTexto("Selecciona el fiel"),
  fecha: zFecha("La fecha del bautismo es obligatoria"),
  ministro: zTextoOpc,
  lugar: zTextoOpc,
  tipo: z.enum(TipoBautismo),
});

export async function registrarBautismo(fd: FormData) {
  return runAction(async () => {
    await requireUser(R.PASTORAL);
    const data = schema.parse(formObj(fd));
    await prisma.$transaction([
      prisma.bautismo.create({ data }),
      prisma.fiel.update({ where: { id: data.fielId }, data: { bautizado: true } }),
    ]);
    revalidatePath("/workspace/bautismos");
    return null;
  });
}

export async function eliminarBautismo(id: string) {
  return runAction(async () => {
    await requireUser(R.ADMIN);
    await prisma.bautismo.delete({ where: { id } });
    revalidatePath("/workspace/bautismos");
    return null;
  });
}
