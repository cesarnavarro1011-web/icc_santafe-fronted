'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Megaphone, X } from 'lucide-react';
import type { AnuncioPublico } from '@/server/contenido';
import { COLORES_ANUNCIO } from './anuncio-colores';

const CLAVE = 'anuncios-cerrados';
const INTERVALO_MS = 6000;

function leerCerrados(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/**
 * Anuncios flotantes en la parte inferior. Si hay varios, rotan uno a la vez
 * (se pausa al pasar el mouse). El visitante puede cerrar cada uno; se recuerda.
 */
export default function AnuncioBar({ anuncios }: { anuncios: AnuncioPublico[] }) {
  const [pendientes, setPendientes] = useState<AnuncioPublico[]>([]);
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const reducir = useReducedMotion();

  // Aparece poco después de cargar, sin los que el visitante ya cerró
  useEffect(() => {
    const cerrados = leerCerrados();
    const lista = anuncios.filter((a) => !cerrados.includes(a.id));
    if (lista.length === 0) return;
    const t = setTimeout(() => setPendientes(lista), 1200);
    return () => clearTimeout(t);
  }, [anuncios]);

  // Solo se muestra cuando el visitante ya bajó más allá del carrusel de la portada (#hero)
  const [pasoHero, setPasoHero] = useState(false);
  useEffect(() => {
    const revisar = () => {
      const hero = document.getElementById('hero');
      const limite = hero ? hero.offsetTop + hero.offsetHeight : window.innerHeight;
      // Aparece cuando la mitad inferior de la pantalla ya está debajo del carrusel
      setPasoHero(window.scrollY + window.innerHeight * 0.5 > limite);
    };
    revisar();
    window.addEventListener('scroll', revisar, { passive: true });
    window.addEventListener('resize', revisar);
    return () => {
      window.removeEventListener('scroll', revisar);
      window.removeEventListener('resize', revisar);
    };
  }, []);

  // Rotación automática
  useEffect(() => {
    if (pendientes.length < 2 || pausado || !pasoHero) return;
    const t = setInterval(() => setIndice((i) => (i + 1) % pendientes.length), INTERVALO_MS);
    return () => clearInterval(t);
  }, [pendientes.length, pausado, pasoHero]);

  const actual = pendientes[indice % Math.max(pendientes.length, 1)];

  function cerrar(id: string) {
    try {
      // Solo se guardan los ids vigentes para que la lista no crezca sin fin
      const vigentes = new Set(anuncios.map((a) => a.id));
      localStorage.setItem(CLAVE, JSON.stringify([...leerCerrados().filter((x) => vigentes.has(x)), id]));
    } catch {}
    const resto = pendientes.filter((a) => a.id !== id);
    setPendientes(resto);
    // Se queda en la misma posición, que ahora muestra el siguiente anuncio
    setIndice((i) => (resto.length ? i % resto.length : 0));
  }

  const colores = actual ? (COLORES_ANUNCIO[actual.color as keyof typeof COLORES_ANUNCIO] ?? COLORES_ANUNCIO.violeta) : null;

  return (
    <AnimatePresence>
      {pasoHero && actual && colores && (
        <motion.div
          key="barra"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', damping: 22 }}
          className="fixed inset-x-3 bottom-4 z-50 mx-auto max-w-3xl"
          role="region"
          aria-label="Anuncios"
          aria-live="polite"
          onMouseEnter={() => setPausado(true)}
          onMouseLeave={() => setPausado(false)}
          onFocus={() => setPausado(true)}
          onBlur={() => setPausado(false)}
        >
          <div className={`overflow-hidden rounded-2xl shadow-2xl shadow-black/30 transition-colors duration-500 ${colores.clases}`}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={actual.id}
                initial={reducir ? { opacity: 0 } : { x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={reducir ? { opacity: 0 } : { x: -60, opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="flex items-center gap-3 px-4 py-3"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Megaphone className="size-4" />
                </span>
                <p className="flex-1 text-sm font-medium md:text-base">{actual.texto}</p>
                {actual.enlace && (
                  <Link
                    href={actual.enlace}
                    onClick={() => cerrar(actual.id)}
                    className="shrink-0 rounded-full bg-white/90 px-4 py-1.5 text-sm font-semibold text-black transition hover:bg-white"
                  >
                    {actual.textoEnlace || 'Ver más'}
                  </Link>
                )}
                <button
                  onClick={() => cerrar(actual.id)}
                  aria-label="Cerrar este anuncio"
                  title="Cerrar este anuncio"
                  className="shrink-0 rounded-full p-1 opacity-80 transition hover:bg-white/20 hover:opacity-100"
                >
                  <X className="size-4" />
                </button>
              </motion.div>
            </AnimatePresence>

            {/* Indicadores: uno por anuncio, clic para saltar a él */}
            {pendientes.length > 1 && (
              <div className="flex justify-center gap-1.5 pb-2">
                {pendientes.map((a, i) => (
                  <button
                    key={a.id}
                    onClick={() => setIndice(i)}
                    aria-label={`Ver anuncio ${i + 1} de ${pendientes.length}`}
                    className={`h-1.5 rounded-full bg-current transition-all ${i === indice % pendientes.length ? 'w-5 opacity-90' : 'w-1.5 opacity-40 hover:opacity-70'}`}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
