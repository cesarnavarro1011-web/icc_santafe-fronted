'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import type { SlidePublica } from '@/server/contenido';

// Se muestra si el gestor de contenido aún no ha publicado diapositivas
const BIENVENIDA: SlidePublica = {
  id: 'bienvenida',
  titulo: 'Bienvenidos a nuestra familia',
  subtitulo: 'Iglesia Cuadrangular Santa Fe',
  descripcion: 'Una comunidad que crece en número y en conocimiento. Te esperamos con los brazos abiertos.',
  imagen: '/images/DSC00630.jpg',
  ctaTexto: 'Conócenos',
  ctaLink: '/nosotros',
};

const INTERVALO = 6000;

export default function Hero({ slides }: { slides: SlidePublica[] }) {
  const lista = slides.length ? slides : [BIENVENIDA];
  const [actual, setActual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [progreso, setProgreso] = useState(0);

  const ir = useCallback((i: number) => {
    setActual((i + lista.length) % lista.length);
    setProgreso(0);
  }, [lista.length]);

  // Avance automático con barra de progreso; se pausa al pasar el mouse o con el botón
  useEffect(() => {
    if (pausado || lista.length <= 1) return;
    const paso = 50;
    const t = setInterval(() => {
      setProgreso((p) => {
        if (p + paso >= INTERVALO) {
          setActual((a) => (a + 1) % lista.length);
          return 0;
        }
        return p + paso;
      });
    }, paso);
    return () => clearInterval(t);
  }, [pausado, lista.length]);

  // Flechas del teclado
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') ir(actual + 1);
      if (e.key === 'ArrowLeft') ir(actual - 1);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [actual, ir]);

  const s = lista[actual];

  return (
    <section
      id="hero"
      className="relative flex h-screen items-center justify-center overflow-hidden bg-[#0b0b0d]"
      // La pausa solo se controla con el botón (no al pasar el cursor)
      onTouchStart={(e) => ((e.currentTarget as HTMLElement).dataset.x = String(e.touches[0].clientX))}
      onTouchEnd={(e) => {
        const x0 = Number((e.currentTarget as HTMLElement).dataset.x);
        const dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 50) ir(actual + (dx < 0 ? 1 : -1));
      }}
    >
      <AnimatePresence mode="sync">
        <motion.div
          key={s.id}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        >
          {s.imagen ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.imagen} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#5a189a] via-[#0E34A0] to-[#710000]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center text-white">
        <AnimatePresence mode="wait">
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.6 }}
          >
            {s.subtitulo && <h2 className="mb-3 text-sm font-semibold tracking-[0.2em] text-[#f5cc00] uppercase md:text-base">{s.subtitulo}</h2>}
            <h1 className="mb-6 text-4xl leading-tight font-bold md:text-6xl">{s.titulo}</h1>
            {s.descripcion && <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-200 md:text-2xl">{s.descripcion}</p>}
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {s.ctaTexto && s.ctaLink && (
                <Link
                  href={s.ctaLink}
                  className="rounded-full bg-white px-8 py-3 font-semibold text-black shadow-lg transition-all duration-200 hover:-translate-y-1 hover:bg-[#f5cc00] hover:text-white hover:shadow-xl"
                >
                  {s.ctaTexto}
                </Link>
              )}
              <Link
                href="/#predicaciones"
                className="flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white hover:text-black"
              >
                <Play className="size-5" /> Ver prédicas
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {lista.length > 1 && (
        <>
          <button onClick={() => ir(actual - 1)} aria-label="Anterior" className="absolute top-1/2 left-4 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition hover:bg-white/25">
            <ChevronLeft className="size-6" />
          </button>
          <button onClick={() => ir(actual + 1)} aria-label="Siguiente" className="absolute top-1/2 right-4 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition hover:bg-white/25">
            <ChevronRight className="size-6" />
          </button>
          <div className="absolute bottom-10 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
            {lista.map((x, i) => (
              <button key={x.id} onClick={() => ir(i)} aria-label={`Ir a ${x.titulo}`} className="h-1.5 w-10 overflow-hidden rounded-full bg-white/30">
                <span
                  className="block h-full rounded-full bg-[#f5cc00]"
                  style={{ width: i < actual ? '100%' : i === actual ? `${(progreso / INTERVALO) * 100}%` : '0%' }}
                />
              </button>
            ))}
            <button onClick={() => setPausado((p) => !p)} aria-label={pausado ? 'Reanudar' : 'Pausar'} className="ml-2 rounded-full p-1 text-white/80 hover:text-white">
              {pausado ? <Play className="size-4" /> : <Pause className="size-4" />}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
