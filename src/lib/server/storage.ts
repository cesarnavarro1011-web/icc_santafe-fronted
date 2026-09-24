import "server-only";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { ErrorNegocio } from "./errors";

// ============================================================
//  Almacenamiento en disco local (reemplaza Google Drive).
//  Estructura equivalente a la de Drive:
//    <STORAGE_DIR>/fieles/<F-xxx - Nombre>/cursos/<CURSO>/...
//                                          /certificados/...
//                                          /bautismos/...
//                                          /firmas/firma.png
//    <STORAGE_DIR>/cursos/<CURSO>/material/...
//  En la BD solo se guarda la ruta relativa.
// ============================================================

export function storageRoot() {
  return path.resolve(process.env.STORAGE_DIR || path.join(process.cwd(), "storage"));
}

export function limpiarNombre(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._ -]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function carpetaFiel(fiel: { codigo: string; nombre: string; apellido: string }) {
  return path.posix.join("fieles", limpiarNombre(`${fiel.codigo} - ${fiel.nombre} ${fiel.apellido}`));
}

/** Resuelve una ruta relativa y garantiza que no se salga de STORAGE_DIR. */
export function rutaAbsoluta(relativa: string) {
  const root = storageRoot();
  const abs = path.resolve(root, relativa);
  if (abs !== root && !abs.startsWith(root + path.sep)) throw new ErrorNegocio("Ruta de archivo inválida");
  return abs;
}

export async function guardarArchivo(relativa: string, contenido: Buffer | Uint8Array) {
  const abs = rutaAbsoluta(relativa);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, contenido);
  return relativa.replace(/\\/g, "/");
}

export async function leerArchivo(relativa: string) {
  return readFile(rutaAbsoluta(relativa));
}

export async function borrarArchivo(relativa: string | null | undefined) {
  if (!relativa) return;
  await rm(rutaAbsoluta(relativa), { force: true });
}

const MB = 1024 * 1024;

/** Valida un File recibido en un FormData y devuelve su contenido. */
export async function leerUpload(
  file: FormDataEntryValue | null,
  opts: { tipos: string[]; maxMB: number; etiqueta: string },
) {
  if (!file || typeof file === "string" || file.size === 0) throw new ErrorNegocio(`Selecciona ${opts.etiqueta}.`);
  if (file.size > opts.maxMB * MB) throw new ErrorNegocio(`El archivo supera ${opts.maxMB} MB.`);
  if (!opts.tipos.includes(file.type)) throw new ErrorNegocio(`Formato no permitido para ${opts.etiqueta}.`);
  return { nombre: limpiarNombre(file.name) || "archivo", buffer: Buffer.from(await file.arrayBuffer()) };
}

export const MIME_POR_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};
