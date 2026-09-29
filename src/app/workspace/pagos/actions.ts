"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/lib/server/action";
import { requireUser } from "@/lib/server/session";
import { cotizar, iniciarPago, simularPagoAprobado } from "@/server/pagos";

/** Aplica un código de promoción y devuelve el nuevo precio. */
export async function cotizarCurso(cursoId: string, codigo: string) {
  return runAction(async () => {
    await requireUser();
    const { costo, descuento, total, promo } = await cotizar(cursoId, codigo);
    return { costo, descuento, total, codigo: promo?.codigo ?? null, descripcion: promo?.descripcion ?? null };
  });
}

/** Crea el pago en Mercado Pago (o matricula de una vez si el total es $0). */
export async function pagarCurso(cursoId: string, codigo: string | null) {
  return runAction(async () => {
    const user = await requireUser();
    const r = await iniciarPago(user, cursoId, codigo);
    revalidatePath("/workspace", "layout");
    return r;
  });
}

export async function simularPago(inscripcionId: string) {
  return runAction(async () => {
    const user = await requireUser();
    await simularPagoAprobado(inscripcionId, user.fielId);
    revalidatePath("/workspace", "layout");
    return null;
  });
}
