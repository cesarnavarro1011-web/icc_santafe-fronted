'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, CalendarPlus, Clock, MapPin, Repeat, Star } from 'lucide-react';
import type { EventoPublico } from '@/server/contenido';
import { CATEGORIAS_EVENTO } from './categorias-evento';

const INICIAL = 6;

function hora12(h: string) {
  const [hh, mm] = h.split(':').map(Number);
  return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'a. m.' : 'p. m.'}`;
}

/** Descarga un .ics para agregar el evento a Google Calendar, Outlook o el calendario del celular. */
function descargarIcs(e: EventoPublico) {
  const [y, m, d] = e.fecha.split('-');
  const [hh, mm] = e.hora.split(':');
  const inicio = `${y}${m}${d}T${hh}${mm}00`;
  const finDate = new Date(Number(y), Number(m) - 1, Number(d), Number(hh) + 2, Number(mm));
  const pad = (n: number) => String(n).padStart(2, '0');
  const fin = `${finDate.getFullYear()}${pad(finDate.getMonth() + 1)}${pad(finDate.getDate())}T${pad(finDate.getHours())}${pad(finDate.getMinutes())}00`;
  const esc = (t: string) => t.replace(/[,;\\]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ICC Santa Fe//Eventos//ES',
    'BEGIN:VEVENT',
    `UID:${e.id}@iccsantafe`,
    `DTSTART;TZID=America/Bogota:${inicio}`,
    `DTEND;TZID=America/Bogota:${fin}`,
    `SUMMARY:${esc(e.titulo)}`,
    `DESCRIPTION:${esc(e.descripcion)}`,
    `LOCATION:${esc(e.lugar)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(e.titulo)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${e.titulo.replace(/[^\w\sáéíóúñ-]/gi, '').trim() || 'evento'}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Cuenta regresiva amigable: "Hoy", "Mañana", "En 5 días". */
function cuanto(fecha: string) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const [y, m, d] = fecha.split('-').map(Number);
  const dias = Math.round((new Date(y, m - 1, d).getTime() - hoy.getTime()) / 86_400_000);
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  if (dias < 7) return `En ${dias} días`;
  return null;
}

export default function EventsSection({ eventos }: { eventos: EventoPublico[] }) {
  const [categoria, setCategoria] = useState<string>('todos');
  const [verTodos, setVerTodos] = useState(false);

  const categorias = useMemo(() => [...new Set(eventos.map((e) => e.categoria))], [eventos]);
  const filtrados = eventos.filter((e) => categoria === 'todos' || e.categoria === categoria);
  const visibles = verTodos ? filtrados : filtrados.slice(0, INICIAL);

  return (
    <section id="eventos" className="scroll-mt-24 bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-semibold tracking-[0.2em] text-[#5a189a] uppercase">Agenda</p>
          <h2 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl">Próximos eventos</h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">No te pierdas nuestras actividades. Agrégalas a tu calendario con un clic.</p>
        </div>

        {eventos.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-10 text-center text-gray-500">Pronto publicaremos nuevos eventos. ¡Vuelve a visitarnos!</p>
        ) : (
          <>
            {categorias.length > 1 && (
              <div className="mb-8 flex flex-wrap justify-center gap-2">
                {['todos', ...categorias].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategoria(c)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      categoria === c ? 'bg-[#0b0b0d] text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {c === 'todos' ? 'Todos' : (CATEGORIAS_EVENTO[c as keyof typeof CATEGORIAS_EVENTO]?.nombre ?? c)}
                  </button>
                ))}
              </div>
            )}

            <motion.div layout className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {visibles.map((e) => {
                  const cat = CATEGORIAS_EVENTO[e.categoria as keyof typeof CATEGORIAS_EVENTO];
                  const [y, m, d] = e.fecha.split('-').map(Number);
                  const f = new Date(y, m - 1, d);
                  const pronto = !e.recurrente && cuanto(e.fecha);
                  return (
                    <motion.article
                      key={e.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${e.destacado ? 'ring-2 ring-[#f5cc00]' : 'border-gray-100'}`}
                    >
                      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-[#5a189a] to-[#0E34A0]">
                        {e.imagen && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={e.imagen} alt={e.titulo} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                        )}
                        <div className="absolute top-3 left-3 flex flex-col items-center rounded-xl bg-white px-3 py-1.5 text-center shadow">
                          <span className="text-2xl leading-none font-bold text-gray-900">{d}</span>
                          <span className="text-[11px] font-semibold text-[#5a189a] uppercase">{f.toLocaleDateString('es-CO', { month: 'short' })}</span>
                        </div>
                        <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                          {cat && <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cat.clases}`}>{cat.nombre}</span>}
                          {e.destacado && (
                            <span className="flex items-center gap-1 rounded-full bg-[#f5cc00] px-2.5 py-1 text-xs font-semibold text-black">
                              <Star className="size-3" /> Destacado
                            </span>
                          )}
                          {pronto && <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">{pronto}</span>}
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <h3 className="mb-2 text-xl font-bold text-gray-900">{e.titulo}</h3>
                        <p className="mb-4 line-clamp-3 flex-1 text-sm text-gray-600">{e.descripcion}</p>
                        <ul className="mb-4 space-y-1.5 text-sm text-gray-600">
                          <li className="flex items-center gap-2">
                            {e.recurrente ? <Repeat className="size-4 text-[#5a189a]" /> : <CalendarDays className="size-4 text-[#5a189a]" />}
                            {e.recurrente ? 'Se realiza periódicamente' : f.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </li>
                          <li className="flex items-center gap-2">
                            <Clock className="size-4 text-[#5a189a]" /> {hora12(e.hora)}
                          </li>
                          <li className="flex items-center gap-2">
                            <MapPin className="size-4 text-[#5a189a]" /> {e.lugar}
                          </li>
                        </ul>
                        <button
                          onClick={() => descargarIcs(e)}
                          className="flex items-center justify-center gap-2 rounded-full border-2 border-[#0b0b0d] px-4 py-2 text-sm font-semibold text-[#0b0b0d] transition hover:bg-[#0b0b0d] hover:text-white"
                        >
                          <CalendarPlus className="size-4" /> Agregar a mi calendario
                        </button>
                      </div>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </motion.div>

            {filtrados.length > INICIAL && (
              <div className="mt-10 text-center">
                <button
                  onClick={() => setVerTodos((v) => !v)}
                  className="rounded-full bg-[#0b0b0d] px-8 py-3 font-semibold text-white shadow-lg transition hover:bg-[#5a189a]"
                >
                  {verTodos ? 'Ver menos' : `Ver los ${filtrados.length} eventos`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
