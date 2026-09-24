import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ConPortada = { id: string; imagenPath: string | null; updatedAt: Date };

/** URL de la portada (con versión para refrescar la caché al cambiarla) o null. */
export function urlPortada(curso: ConPortada) {
  return curso.imagenPath ? `/api/archivos/portada/${curso.id}?v=${curso.updatedAt.getTime()}` : null;
}

/**
 * Cabecera de tarjeta de curso: la imagen de portada con un velo oscuro para que
 * el texto blanco se lea, o el degradado de siempre si el curso no tiene imagen.
 */
export function CursoPortada({
  portada,
  gradiente = "from-violet-500 to-fuchsia-500",
  className,
  children,
}: {
  portada: string | null;
  gradiente?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("relative overflow-hidden text-white", portada ? "bg-slate-800 bg-cover bg-center" : cn("bg-gradient-to-br", gradiente), className)}
      style={
        portada
          ? { backgroundImage: `linear-gradient(to top, rgba(15,10,40,.88), rgba(15,10,40,.35)), url("${portada}")` }
          : undefined
      }
    >
      {!portada && <div className="pointer-events-none absolute -top-6 -right-6 size-24 rounded-full bg-white/10" />}
      <div className="relative">{children}</div>
    </div>
  );
}
