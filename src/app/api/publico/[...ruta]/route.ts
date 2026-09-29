import path from "path";
import { NextResponse } from "next/server";
import { leerArchivo, MIME_POR_EXT } from "@/lib/server/storage";

// Imágenes de la página web pública (portada, eventos, prédicas, ministerios).
// Solo sirve archivos dentro de STORAGE_DIR/web/: el resto del disco (tareas,
// certificados, firmas) sigue protegido por /api/archivos con permisos.

const IMAGENES = new Set([".png", ".jpg", ".jpeg", ".webp"]);

export async function GET(_req: Request, { params }: { params: Promise<{ ruta: string[] }> }) {
  const { ruta } = await params;
  const relativa = ruta.join("/");
  const ext = path.extname(relativa).toLowerCase();
  if (!relativa.startsWith("web/") || relativa.includes("..") || !IMAGENES.has(ext)) {
    return NextResponse.json({ message: "No encontrado" }, { status: 404 });
  }
  try {
    const contenido = await leerArchivo(relativa);
    return new NextResponse(new Uint8Array(contenido), {
      headers: {
        "Content-Type": MIME_POR_EXT[ext],
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; sandbox",
      },
    });
  } catch {
    return NextResponse.json({ message: "No encontrado" }, { status: 404 });
  }
}
