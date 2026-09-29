'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, Eye, Play, Search, Share2, User, X } from 'lucide-react';
import { registrarVista } from '@/app/acciones-publicas';
import type { PredicaPublica } from '@/server/contenido';

const fechaLarga = (f: string) => {
  const [y, m, d] = f.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
};

function Miniatura({ p, grande }: { p: PredicaPublica; grande?: boolean }) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-[#5a189a] to-[#0E34A0] aspect-video`}>
      {p.imagen && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.imagen} alt={p.titulo} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/25 transition group-hover:bg-black/40">
        <span className={`flex items-center justify-center rounded-full bg-white/95 text-[#5a189a] shadow-xl transition group-hover:scale-110 ${grande ? 'size-20' : 'size-14'}`}>
          <Play className={`${grande ? 'size-9' : 'size-6'} translate-x-0.5 fill-current`} />
        </span>
      </div>
      {p.serie && <span className="absolute top-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">{p.serie}</span>}
    </div>
  );
}

export default function SermonsSection({ predicas }: { predicas: PredicaPublica[] }) {
  const [busqueda, setBusqueda] = useState('');
  const [serie, setSerie] = useState('todas');
  const [abierta, setAbierta] = useState<PredicaPublica | null>(null);
  const [cuantas, setCuantas] = useState(6);
  const [copiado, setCopiado] = useState(false);

  const series = useMemo(() => [...new Set(predicas.map((p) => p.serie).filter(Boolean))] as string[], [predicas]);
  const destacada = predicas.find((p) => p.destacada) ?? predicas[0];
  const q = busqueda.trim().toLowerCase();
  const filtradas = predicas.filter(
    (p) =>
      (serie === 'todas' || p.serie === serie) &&
      (!q || [p.titulo, p.predicador, p.descripcion ?? '', ...p.etiquetas].some((t) => t.toLowerCase().includes(q))),
  );
  const sinFiltro = !q && serie === 'todas';
  const lista = sinFiltro ? filtradas.filter((p) => p.id !== destacada?.id) : filtradas;

  // Abrir una prédica desde un enlace compartido (#predica-<id>)
  useEffect(() => {
    const id = window.location.hash.match(/^#predica-(.+)$/)?.[1];
    const p = id && predicas.find((x) => x.id === id);
    if (p) abrir(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAbierta(null);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  function abrir(p: PredicaPublica) {
    setAbierta(p);
    setCopiado(false);
    registrarVista(p.id).catch(() => {});
  }

  async function compartir(p: PredicaPublica) {
    const url = `${window.location.origin}/#predica-${p.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: p.titulo, text: `${p.titulo} — ${p.predicador}`, url });
        return;
      } catch {}
    }
    await navigator.clipboard?.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <section id="predicaciones" className="scroll-mt-24 bg-gray-50 py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-semibold tracking-[0.2em] text-[#5a189a] uppercase">Palabra</p>
          <h2 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl">Prédicas</h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">Vuelve a ver los mensajes y compártelos con quien los necesite.</p>
        </div>

        {predicas.length === 0 ? (
          <p className="rounded-2xl border border-dashed bg-white p-10 text-center text-gray-500">Muy pronto publicaremos nuestras prédicas.</p>
        ) : (
          <>
            {sinFiltro && destacada && (
              <button onClick={() => abrir(destacada)} className="group mb-10 grid w-full overflow-hidden rounded-3xl bg-[#0b0b0d] text-left text-white shadow-xl md:grid-cols-5">
                <div className="md:col-span-3">
                  <Miniatura p={destacada} grande />
                </div>
                <div className="flex flex-col justify-center gap-3 p-6 md:col-span-2 md:p-8">
                  <span className="w-fit rounded-full bg-[#f5cc00] px-3 py-1 text-xs font-bold text-black uppercase">{destacada.destacada ? 'Destacada' : 'Más reciente'}</span>
                  <h3 className="text-2xl leading-tight font-bold md:text-3xl">{destacada.titulo}</h3>
                  {destacada.descripcion && <p className="line-clamp-3 text-gray-300">{destacada.descripcion}</p>}
                  <p className="text-sm text-gray-400">
                    {destacada.predicador} · {fechaLarga(destacada.fecha)}
                  </p>
                </div>
              </button>
            )}

            <div className="mb-8 flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-gray-400" />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por tema, predicador o palabra clave…"
                  className="w-full rounded-full border border-gray-200 bg-white py-3 pr-4 pl-12 outline-none focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                />
              </div>
              {series.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {['todas', ...series].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSerie(s)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${serie === s ? 'bg-[#0b0b0d] text-white' : 'bg-white text-gray-700 hover:bg-gray-200'}`}
                    >
                      {s === 'todas' ? 'Todas las series' : s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {lista.length === 0 ? (
              <p className="py-10 text-center text-gray-500">No encontramos prédicas con esa búsqueda.</p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {lista.slice(0, cuantas).map((p) => (
                  <button key={p.id} onClick={() => abrir(p)} className="group overflow-hidden rounded-2xl bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                    <Miniatura p={p} />
                    <div className="p-5">
                      <h3 className="mb-2 line-clamp-2 text-lg font-bold text-gray-900">{p.titulo}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="size-3.5" /> {p.predicador}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3.5" /> {fechaLarga(p.fecha)}
                        </span>
                        {p.vistas > 0 && (
                          <span className="flex items-center gap-1">
                            <Eye className="size-3.5" /> {p.vistas}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {lista.length > cuantas && (
              <div className="mt-10 text-center">
                <button onClick={() => setCuantas((c) => c + 6)} className="rounded-full bg-[#0b0b0d] px-8 py-3 font-semibold text-white shadow-lg transition hover:bg-[#5a189a]">
                  Ver más prédicas
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Reproductor dentro de la página */}
      <AnimatePresence>
        {abierta && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAbierta(null)}
          >
            <motion.div
              className="w-full max-w-4xl overflow-hidden rounded-2xl bg-[#0b0b0d] text-white shadow-2xl"
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="aspect-video bg-black">
                {abierta.embed ? (
                  <iframe
                    src={abierta.embed}
                    title={abierta.titulo}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <a href={abierta.videoUrl} target="_blank" rel="noreferrer" className="flex h-full items-center justify-center underline">
                    Ver el video
                  </a>
                )}
              </div>
              <div className="flex flex-wrap items-start gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold">{abierta.titulo}</h3>
                  <p className="text-sm text-gray-400">
                    {abierta.predicador} · {fechaLarga(abierta.fecha)}
                    {abierta.serie && ` · ${abierta.serie}`}
                  </p>
                  {abierta.descripcion && <p className="mt-2 text-sm text-gray-300">{abierta.descripcion}</p>}
                  {abierta.etiquetas.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {abierta.etiquetas.map((t) => (
                        <button
                          key={t}
                          onClick={() => {
                            setBusqueda(t);
                            setSerie('todas');
                            setAbierta(null);
                          }}
                          className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs hover:bg-white/20"
                        >
                          #{t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => compartir(abierta)} className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20">
                    <Share2 className="size-4" /> {copiado ? '¡Enlace copiado!' : 'Compartir'}
                  </button>
                  <button onClick={() => setAbierta(null)} aria-label="Cerrar" className="rounded-full bg-white/10 p-2 hover:bg-white/20">
                    <X className="size-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
