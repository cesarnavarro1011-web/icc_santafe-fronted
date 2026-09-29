import "server-only";
import type { Comunicado } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ROL_LABEL, ROLES } from "@/lib/roles";
import { leerDestinatarios } from "@/server/comunicados";
import type { DatosComunicado, OpcionesDestino } from "./comunicado-form";

export async function opcionesDestino(): Promise<OpcionesDestino> {
  const [grupos, cursos, cargos] = await Promise.all([
    prisma.grupo.findMany({ where: { estado: "ACTIVO" }, orderBy: { nombre: "asc" }, include: { lider: { select: { nombre: true, apellido: true } } } }),
    prisma.curso.findMany({ where: { estado: "ACTIVO" }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    prisma.area.findMany({ where: { estado: "ACTIVO" }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
  ]);
  return {
    rol: ROLES.map((r) => ({ value: r, label: ROL_LABEL[r] })),
    grupo: grupos.map((g) => ({ value: g.id, label: g.lider ? `${g.nombre} · ${g.lider.nombre} ${g.lider.apellido}` : g.nombre })),
    curso: cursos.map((c) => ({ value: c.id, label: c.nombre })),
    cargo: cargos.map((a) => ({ value: a.id, label: a.nombre })),
  };
}

/** "Estudiantes de Teología 1", "Grupo Jóvenes"… */
export function describirDestino(c: Comunicado, op: OpcionesDestino) {
  const d = leerDestinatarios(c.destinatarios);
  if (d.tipo === "todos") return "Todos los fieles activos";
  const nombre = op[d.tipo].find((o) => o.value === d.valor)?.label ?? "(ya no existe)";
  return { rol: `Rol: ${nombre}`, grupo: `Grupo: ${nombre}`, curso: `Estudiantes de ${nombre}`, cargo: `Cargo: ${nombre}` }[d.tipo];
}

export function datosFormulario(c: Comunicado): DatosComunicado {
  const d = leerDestinatarios(c.destinatarios);
  return {
    asunto: c.asunto,
    cuerpo: c.cuerpo,
    enlaceUrl: c.enlaceUrl,
    enlaceTexto: c.enlaceTexto,
    porCorreo: c.porCorreo,
    porWhatsapp: c.porWhatsapp,
    tipo: d.tipo,
    valor: d.valor ?? null,
    imagenes: c.imagenes.map((ruta, i) => ({ ruta, url: `/api/archivos/comunicado/${c.id}~${i}?v=${c.updatedAt.getTime()}` })),
  };
}
