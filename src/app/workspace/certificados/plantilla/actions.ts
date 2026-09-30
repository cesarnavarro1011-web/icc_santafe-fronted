"use server";

import path from "path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { runAction } from "@/lib/server/action";
import { formObj, zBool, zTextoOpc } from "@/lib/server/form";
import { requireUser } from "@/lib/server/session";
import { borrarArchivo, guardarArchivo, leerUpload } from "@/lib/server/storage";
import { obtenerPlantillaCertificado } from "@/server/certificados";

const schema = z.object({
  institucion: zTextoOpc,
  subtitulo: zTextoOpc,
  titulo: zTextoOpc,
  textoIntro: zTextoOpc,
  textoPrograma: zTextoOpc,
  versiculo: zTextoOpc,
  versiculoCita: zTextoOpc,
  mostrarVersiculo: zBool,
  lugar: zTextoOpc,
  cargoMaestro: zTextoOpc,
  cargoSupervisor: zTextoOpc,
  cargoPastor: zTextoOpc,
  prefijoCodigo: zTextoOpc.transform((p) => (p ? p.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) || null : null)),
});

/** Sube (o quita) el logo o el sello. PNG o JPG: son los formatos que acepta el PDF. */
async function imagen(fd: FormData, campo: "logo" | "sello", actual: string | null) {
  const file = fd.get(campo);
  if (file && typeof file !== "string" && file.size > 0) {
    const etiqueta = campo === "logo" ? "el logo" : "la imagen del sello";
    const { nombre, buffer } = await leerUpload(file, { tipos: ["image/png", "image/jpeg"], maxMB: 3, etiqueta });
    const ruta = await guardarArchivo(`certificados/plantilla/${campo}-${Date.now()}${path.extname(nombre).toLowerCase() || ".png"}`, buffer);
    await borrarArchivo(actual);
    return ruta;
  }
  if (fd.get(campo === "logo" ? "quitarLogo" : "quitarSello") === "on") {
    await borrarArchivo(actual);
    return null;
  }
  return undefined; // sin cambios
}

export async function guardarPlantillaCertificado(fd: FormData) {
  return runAction(async () => {
    await requireUser(R.ADMIN);
    const d = schema.parse(formObj(fd));
    const actual = await obtenerPlantillaCertificado();
    const [logoPath, selloPath] = await Promise.all([imagen(fd, "logo", actual.logoPath), imagen(fd, "sello", actual.selloPath)]);
    await prisma.plantillaCertificado.update({
      where: { id: "principal" },
      data: { ...d, ...(logoPath !== undefined ? { logoPath } : {}), ...(selloPath !== undefined ? { selloPath } : {}) },
    });
    revalidatePath("/workspace/certificados/plantilla");
    return null;
  });
}
