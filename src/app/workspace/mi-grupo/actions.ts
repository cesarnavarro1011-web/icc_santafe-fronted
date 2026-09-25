"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { runAction } from "@/lib/server/action";
import { ErrorNegocio } from "@/lib/server/errors";
import { requireUser } from "@/lib/server/session";

/**
 * El líder nombra (o quita) marcadores entre los fieles de su grupo.
 * Solo cambia entre Estudiante ⇄ Marcador; otros roles no se tocan.
 */
export async function cambiarMarcador(fielId: string, activar: boolean) {
  return runAction(async () => {
    const user = await requireUser(["LIDER", "SUPERADMIN", "PASTOR"]);
    const fiel = await prisma.fiel.findUniqueOrThrow({ where: { id: fielId }, include: { grupo: true, usuario: true } });
    if (user.rol === "LIDER" && fiel.grupo?.liderId !== user.fielId) throw new ErrorNegocio("Esta persona no pertenece a tu grupo.");
    if (!fiel.usuario) throw new ErrorNegocio("Esta persona aún no tiene acceso al sistema. Pídele al pastor que le cree uno.");
    if (!["ESTUDIANTE", "MARCADOR"].includes(fiel.usuario.rol)) {
      throw new ErrorNegocio("Solo se puede nombrar marcador a quien tiene rol Estudiante.");
    }
    await prisma.usuario.update({ where: { id: fiel.usuario.id }, data: { rol: activar ? "MARCADOR" : "ESTUDIANTE" } });
    revalidatePath("/workspace/mi-grupo");
    revalidatePath("/workspace/grupos");
    return null;
  });
}
