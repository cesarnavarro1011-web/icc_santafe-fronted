"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { runAction } from "@/lib/server/action";
import { requireUser } from "@/lib/server/session";
import { firmarCertificado } from "@/server/certificados";

export async function firmar(certificadoId: string, como: "SUPERVISOR" | "PASTOR") {
  return runAction(async () => {
    const user = await requireUser(R.SUPERVISION);
    await firmarCertificado(user, certificadoId, como);
    revalidatePath("/workspace/certificados");
    return null;
  });
}

export async function anular(certificadoId: string) {
  return runAction(async () => {
    await requireUser(R.ADMIN);
    await prisma.certificado.update({ where: { id: certificadoId }, data: { estado: "ANULADO" } });
    revalidatePath("/workspace/certificados");
    return null;
  });
}
