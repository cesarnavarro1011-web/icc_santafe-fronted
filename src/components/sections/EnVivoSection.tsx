import { ExternalLink } from 'lucide-react';
import type { EnVivoPublico } from '@/server/contenido';

/** Reproductor de la transmisión, justo debajo del hero. Solo se muestra mientras están al aire. */
export default function EnVivoSection({ envivo }: { envivo: EnVivoPublico }) {
  if (!envivo.alAire || !envivo.embed) return null;
  return (
    <section id="en-vivo" className="scroll-mt-20 bg-[#0b0b0d] px-4 py-14 text-white md:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-bold tracking-widest uppercase">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-white" />
            </span>
            En vivo
          </span>
          <h2 className="text-3xl font-bold md:text-4xl">{envivo.titulo}</h2>
          {envivo.descripcion && <p className="max-w-2xl text-gray-300">{envivo.descripcion}</p>}
        </div>

        <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10">
          <iframe
            src={envivo.embed}
            title={envivo.titulo}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm text-gray-400">
          <span>El video inicia sin sonido: toca el reproductor para activarlo.</span>
          {envivo.url && (
            <a href={envivo.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-white hover:text-[#f5cc00]">
              Abrir en {envivo.plataforma ?? 'la plataforma'} <ExternalLink className="size-4" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
