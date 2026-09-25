import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { R, tieneRol } from "@/lib/roles";
import { getSessionUser, type UsuarioSesion } from "@/lib/server/session";
import { leerArchivo, MIME_POR_EXT } from "@/lib/server/storage";
import { cursosEnAlcance } from "@/server/academico";

// Sirve archivos del disco local verificando permisos (reemplaza los links públicos de Drive).
//   /api/archivos/entrega/<id>      PDF de tarea: el estudiante o el staff del curso
//   /api/archivos/material/<id>     material de una actividad: matriculados y staff
//   /api/archivos/certificado/<id>  diploma: el estudiante o staff académico
//   /api/archivos/comprobante/<id>  comprobante de pago: el fiel o admin
//   /api/archivos/firma/<usuarioId> firma digital: el dueño o admin
//   /api/archivos/portada/<cursoId> imagen del curso: cualquier usuario con sesión

async function staffDelCurso(user: UsuarioSesion, cursoId: string) {
  if (!tieneRol(user.rol, R.ACADEMICO)) return false;
  const alcance = await cursosEnAlcance(user);
  return alcance === null || alcance.includes(cursoId);
}

async function resolver(tipo: string, id: string, user: UsuarioSesion) {
  switch (tipo) {
    case "entrega": {
      const e = await prisma.entrega.findUnique({ where: { id }, include: { actividad: true } });
      if (!e?.archivoPath) return null;
      const ok = e.fielId === user.fielId || (await staffDelCurso(user, e.actividad.cursoId));
      return ok ? { ruta: e.archivoPath, nombre: e.archivoNombre ?? "tarea.pdf" } : "denegado";
    }
    case "material": {
      const a = await prisma.actividad.findUnique({ where: { id } });
      if (!a?.materialPath) return null;
      const matriculado = await prisma.matricula.count({ where: { fielId: user.fielId, cursoId: a.cursoId } });
      const ok = matriculado > 0 || (await staffDelCurso(user, a.cursoId));
      return ok ? { ruta: a.materialPath, nombre: path.basename(a.materialPath) } : "denegado";
    }
    case "certificado": {
      const c = await prisma.certificado.findUnique({ where: { id } });
      if (!c?.pdfPath) return null;
      const ok = c.fielId === user.fielId || (await staffDelCurso(user, c.cursoId));
      return ok ? { ruta: c.pdfPath, nombre: `Certificado_${c.codigo}.pdf` } : "denegado";
    }
    case "comprobante": {
      const i = await prisma.inscripcion.findUnique({ where: { id } });
      if (!i?.comprobantePath) return null;
      const ok = i.fielId === user.fielId || tieneRol(user.rol, R.ADMIN);
      return ok ? { ruta: i.comprobantePath, nombre: path.basename(i.comprobantePath) } : "denegado";
    }
    case "firma": {
      const u = await prisma.usuario.findUnique({ where: { id } });
      if (!u?.firmaPath) return null;
      const ok = u.id === user.id || tieneRol(user.rol, R.ADMIN);
      return ok ? { ruta: u.firmaPath, nombre: "firma.png" } : "denegado";
    }
    case "portada": {
      const c = await prisma.curso.findUnique({ where: { id } });
      if (!c?.imagenPath) return null;
      return { ruta: c.imagenPath, nombre: path.basename(c.imagenPath) };
    }
    default:
      return null;
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ tipo: string; id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "No autenticado" }, { status: 401 });

  const { tipo, id } = await params;
  const archivo = await resolver(tipo, id, user);
  if (archivo === "denegado") return NextResponse.json({ message: "Sin permiso" }, { status: 403 });
  if (!archivo) return NextResponse.json({ message: "Archivo no encontrado" }, { status: 404 });

  try {
    const contenido = await leerArchivo(archivo.ruta);
    const mime = MIME_POR_EXT[path.extname(archivo.ruta).toLowerCase()] ?? "application/octet-stream";
    const descargar = new URL(req.url).searchParams.has("descargar");
    return new NextResponse(new Uint8Array(contenido), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `${descargar ? "attachment" : "inline"}; filename="${encodeURIComponent(archivo.nombre)}"`,
        "Cache-Control": tipo === "portada" ? "private, max-age=86400" : "private, max-age=60",
        "X-Content-Type-Options": "nosniff",
        // Imágenes en modo aislado; el visor de PDF de los navegadores no funciona con "sandbox"
        ...(mime.startsWith("image/") ? { "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; sandbox" } : {}),
      },
    });
  } catch {
    return NextResponse.json({ message: "El archivo ya no existe en el disco." }, { status: 404 });
  }
}
