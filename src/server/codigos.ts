import "server-only";
import { randomInt } from "crypto";

/**
 * Códigos legibles con el mismo formato del sistema anterior
 * ("MAT-34385477", "INS-382586", "CERT-12345678"...), con 2 dígitos
 * aleatorios extra para evitar choques si se crean en el mismo milisegundo.
 */
export function nuevoCodigo(prefijo: "F" | "CUR" | "ACT" | "INS" | "MAT" | "PQ" | "CERT") {
  const largo = prefijo === "INS" || prefijo === "ACT" || prefijo === "PQ" || prefijo === "CUR" ? 6 : 8;
  return `${prefijo}-${Date.now().toString().slice(-largo)}${randomInt(10, 100)}`;
}

/** Código de fiel: "F-<documento>" si se conoce la cédula, si no uno autogenerado. */
export function codigoFiel(documento?: string | null) {
  const doc = documento?.replace(/\D/g, "");
  return doc ? `F-${doc}` : nuevoCodigo("F");
}
