'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight, Clock, Users } from 'lucide-react';
import type { MinisterioPublico } from '@/server/contenido';

export default function MinistriesSection({ ministerios }: { ministerios: MinisterioPublico[] }) {
  if (ministerios.length === 0) return null;
  return (
    <section id="ministerios" className="scroll-mt-24 bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-12 text-center">
          <p className="mb-2 text-sm font-semibold tracking-[0.2em] text-[#5a189a] uppercase">Sirve con nosotros</p>
          <h2 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl">Ministerios</h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">Hay un lugar para ti y para toda tu familia. Encuentra el tuyo.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ministerios.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.1 }}
            >
              <Link
                href={`/ministerios/${m.slug}`}
                className="group relative flex h-80 flex-col justify-end overflow-hidden rounded-3xl bg-gradient-to-br from-[#5a189a] to-[#0E34A0] p-6 text-white shadow-lg"
              >
                {m.imagen && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.imagen} alt={m.nombre} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition group-hover:from-[#5a189a]/95" />
                <div className="relative">
                  <h3 className="mb-2 text-2xl font-bold">{m.nombre}</h3>
                  {/* Se despliega al pasar el mouse */}
                  <div className="grid grid-rows-[0fr] transition-all duration-500 group-hover:grid-rows-[1fr]">
                    <div className="overflow-hidden">
                      <p className="mb-3 line-clamp-3 text-sm text-gray-200">{m.descripcion}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-200">
                    {m.publico && (
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5" /> {m.publico}
                      </span>
                    )}
                    {m.horario && (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" /> {m.horario}
                      </span>
                    )}
                  </div>
                  <span className="mt-4 flex items-center gap-1 text-sm font-semibold text-[#f5cc00]">
                    Conocer más <ChevronRight className="size-4 transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
