import "server-only";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { ErrorNegocio } from "./errors";
import type { ActionResult } from "@/lib/action-result";

export { ErrorNegocio };

/** Envuelve una server action y convierte excepciones en mensajes legibles. */
export async function runAction<T = null>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { success: true, data: await fn() };
  } catch (e) {
    if (e instanceof ErrorNegocio) return { success: false, error: e.message };
    if (e instanceof ZodError) return { success: false, error: e.issues[0]?.message ?? "Datos inválidos" };
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") return { success: false, error: "Ya existe un registro con esos datos." };
      if (e.code === "P2025") return { success: false, error: "El registro no existe." };
    }
    console.error("[action]", e);
    return { success: false, error: "Ocurrió un error inesperado. Revisa la consola del servidor." };
  }
}
