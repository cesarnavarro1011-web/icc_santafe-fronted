"use server";

import { EstadoRegistro, TipoActividad } from "@prisma/client";
import path from "path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { runAction } from "@/lib/server/action";
import { ErrorNegocio } from "@/lib/server/errors";
import { formObj, zEntero, zEnteroOpc, zNumero, zTexto, zTextoOpc } from "@/lib/server/form";
import { requireUser } from "@/lib/server/session";
import { borrarArchivo, guardarArchivo, leerUpload, limpiarNombre } from "@/lib/server/storage";
import { nuevoCodigo } from "@/server/codigos";

const cursoSchema = z.object({
  codigo: zTextoOpc,
  nombre: zTexto("El nombre del curso es obligatorio"),
  nivel: zEnteroOpc,
  descripcion: zTextoOpc,
  duracionDias: zEntero("Duración inválida").min(1).default(90),
  costo: zNumero("Costo inválido").min(0).default(0),
  estado: z.enum(EstadoRegistro).default("ACTIVO"),
  horaInicio: z.preprocess((v) => (v === "" ? null : v), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida").nullable().optional()),
  horaFin: z.preprocess((v) => (v === "" ? null : v), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida").nullable().optional()),
});

export async function guardarCurso(id: string | null, fd: FormData) {
  return runAction(async () => {
    await requireUser(R.ADMIN);
    const { codigo, horaInicio, horaFin, ...resto } = cursoSchema.parse(formObj(fd));
    const diasClase = [...new Set(fd.getAll("dias").map(Number))].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort();
    if (horaInicio && horaFin && horaFin <= horaInicio) throw new ErrorNegocio("La hora de fin debe ser después de la de inicio.");
    const data = { ...resto, diasClase, horaInicio: horaInicio ?? null, horaFin: horaFin ?? null };
    const curso = id
      ? await prisma.curso.update({ where: { id }, data })
      : await prisma.curso.create({
          data: { ...data, codigo: (codigo ?? nuevoCodigo("CUR")).toUpperCase().replace(/\s+/g, "-") },
        });
    await guardarPortada(curso, fd);
    revalidatePath("/workspace", "layout");
    return { id: curso.id };
  });
}

/** Imagen de portada opcional: se reemplaza si llega un archivo, se borra si marcan "quitar". */
async function guardarPortada(curso: { id: string; codigo: string; imagenPath: string | null }, fd: FormData) {
  const file = fd.get("imagen");
  if (file && typeof file !== "string" && file.size > 0) {
    const { nombre, buffer } = await leerUpload(file, {
      tipos: ["image/png", "image/jpeg", "image/webp"],
      maxMB: 5,
      etiqueta: "la imagen del curso",
    });
    const ruta = await guardarArchivo(
      `cursos/${limpiarNombre(curso.codigo)}/portada-${Date.now()}${path.extname(nombre).toLowerCase() || ".jpg"}`,
      buffer,
    );
    await prisma.curso.update({ where: { id: curso.id }, data: { imagenPath: ruta } });
    await borrarArchivo(curso.imagenPath);
  } else if (fd.get("quitarImagen") === "on" && curso.imagenPath) {
    await prisma.curso.update({ where: { id: curso.id }, data: { imagenPath: null } });
    await borrarArchivo(curso.imagenPath);
  }
}

const actividadSchema = z.object({
  nivel: zEntero("Nivel inválido").min(1),
  tipo: z.enum(TipoActividad),
  nombre: zTexto("El nombre de la actividad es obligatorio"),
  notaMax: zNumero("Nota máxima inválida").positive().default(10),
  peso: zNumero("Peso inválido").min(0).default(100),
  linkMaterial: z.preprocess((v) => (v === "" ? null : v), z.url("Link inválido").nullable().optional()),
  instrucciones: zTextoOpc,
  orden: zEntero("Orden inválido").default(0),
});

export async function guardarActividad(cursoId: string, id: string | null, fd: FormData) {
  return runAction(async () => {
    await requireUser(R.ADMIN);
    const data = actividadSchema.parse(formObj(fd));
    const act = id
      ? await prisma.actividad.update({ where: { id }, data })
      : await prisma.actividad.create({ data: { ...data, cursoId, codigo: nuevoCodigo("ACT") } });

    const file = fd.get("material");
    if (file && typeof file !== "string" && file.size > 0) {
      const { nombre, buffer } = await leerUpload(file, {
        tipos: ["application/pdf", "image/png", "image/jpeg"],
        maxMB: 20,
        etiqueta: "el material",
      });
      const curso = await prisma.curso.findUniqueOrThrow({ where: { id: cursoId } });
      const ruta = await guardarArchivo(
        `cursos/${limpiarNombre(curso.codigo)}/material/${act.codigo}${path.extname(nombre) || ".pdf"}`,
        buffer,
      );
      await prisma.actividad.update({ where: { id: act.id }, data: { materialPath: ruta } });
    }
    revalidatePath(`/workspace/cursos/${cursoId}`);
    return null;
  });
}

export async function eliminarActividad(id: string) {
  return runAction(async () => {
    await requireUser(R.ADMIN);
    const act = await prisma.actividad.findUniqueOrThrow({
      where: { id },
      include: { _count: { select: { entregas: true, notas: true, intentos: true } } },
    });
    const usos = act._count.entregas + act._count.notas + act._count.intentos;
    if (usos > 0) {
      throw new ErrorNegocio("La actividad ya tiene entregas o notas; no se puede eliminar.");
    }
    await prisma.actividad.delete({ where: { id } });
    await borrarArchivo(act.materialPath);
    revalidatePath(`/workspace/cursos/${act.cursoId}`);
    return null;
  });
}
