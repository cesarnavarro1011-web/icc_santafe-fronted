import "server-only";
import { z } from "zod";

/** FormData → objeto plano (ignora archivos). */
export function formObj(fd: FormData) {
  const o: Record<string, string> = {};
  fd.forEach((v, k) => {
    if (typeof v === "string") o[k] = v;
  });
  return o;
}

const vacioANull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

export const zTexto = (msg: string) => z.string({ error: msg }).trim().min(1, msg);
export const zTextoOpc = z.preprocess(vacioANull, z.string().trim().nullable().optional());
export const zCorreoOpc = z.preprocess(vacioANull, z.email("Correo inválido").nullable().optional());
export const zFechaOpc = z.preprocess(vacioANull, z.coerce.date({ error: "Fecha inválida" }).nullable().optional());
export const zFecha = (msg: string) => z.coerce.date({ error: msg });
export const zEntero = (msg: string) => z.coerce.number({ error: msg }).int(msg);
export const zNumero = (msg: string) => z.coerce.number({ error: msg });
export const zEnteroOpc = z.preprocess(vacioANull, z.coerce.number().int().nullable().optional());
export const zBool = z.preprocess((v) => v === "on" || v === "true" || v === "SI" || v === true, z.boolean());
export const zEnum = <T extends string>(valores: readonly [T, ...T[]], msg = "Opción inválida") =>
  z.enum(valores, { error: msg });
