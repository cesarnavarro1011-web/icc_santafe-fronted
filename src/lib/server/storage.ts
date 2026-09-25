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
  const buffer = Buffer.from(await file.arrayBuffer());
  // El tipo que manda el navegador se puede falsificar: se revisa el contenido real
  const real = tipoReal(buffer);
  if (!real || !opts.tipos.includes(real)) throw new ErrorNegocio(`El archivo no es un ${opts.etiqueta.replace(/^(la|el|tu) /, "")} válido.`);
  return { nombre: limpiarNombre(file.name) || "archivo", buffer };
}

/** Tipo según los primeros bytes del archivo (PDF, PNG, JPEG, WebP). */
export function tipoReal(b: Buffer): string | null {
  if (b.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

export const MIME_POR_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};
