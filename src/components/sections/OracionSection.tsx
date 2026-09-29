'use client';

import { useState, useTransition } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HandHeart, Heart, Send } from 'lucide-react';
import { enviarPeticion } from '@/app/acciones-publicas';

/** Formulario público de petición de oración (llega a la bandeja del equipo). */
export default function OracionSection() {
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');
  const [anonima, setAnonima] = useState(false);
  const [largo, setLargo] = useState(0);
  const [pending, startTransition] = useTransition();

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setError('');
    startTransition(async () => {
      const res = await enviarPeticion(fd);
      if (!res.success) return void setError(res.error);
      form.reset();
      setLargo(0);
      setEnviado(true);
    });
  }

  return (
    <section id="oracion" className="relative scroll-mt-24 overflow-hidden bg-[#0b0b0d] py-20 text-white">
      <div className="pointer-events-none absolute -top-40 -left-40 size-96 rounded-full bg-[#5a189a]/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 -bottom-40 size-96 rounded-full bg-[#0E34A0]/40 blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-2 md:px-8">
        <div>
          <HandHeart className="mb-4 size-12 text-[#f5cc00]" />
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">¿Cómo podemos orar por ti?</h2>
          <p className="mb-6 text-lg text-gray-300">
            No estás solo. Déjanos tu petición y nuestro equipo de intercesión orará por ti. Si quieres, también podemos contactarte.
          </p>
          <p className="text-sm text-gray-400">“Echando toda vuestra ansiedad sobre él, porque él tiene cuidado de vosotros.” — 1 Pedro 5:7</p>
        </div>

        <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur md:p-8">
          <AnimatePresence mode="wait">
            {enviado ? (
              <motion.div key="ok" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center">
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: 2, duration: 0.6 }} className="mx-auto mb-4 w-fit">
                  <Heart className="size-14 fill-[#f5cc00] text-[#f5cc00]" />
                </motion.div>
                <h3 className="mb-2 text-2xl font-bold">¡Recibimos tu petición!</h3>
                <p className="mb-6 text-gray-300">Estaremos orando por ti. Dios te bendiga.</p>
                <button onClick={() => setEnviado(false)} className="rounded-full border border-white/30 px-5 py-2 text-sm hover:bg-white/10">
                  Enviar otra petición
                </button>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={enviar} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {/* Campo trampa para bots: los humanos no lo ven */}
                <input name="sitio" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" name="anonima" checked={anonima} onChange={(e) => setAnonima(e.target.checked)} className="size-4 accent-[#f5cc00]" />
                  Enviar de forma anónima
                </label>
                {!anonima && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      name="nombre"
                      required
                      maxLength={80}
                      placeholder="Tu nombre"
                      className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 outline-none placeholder:text-gray-400 focus:border-[#f5cc00]"
                    />
                    <input
                      name="contacto"
                      maxLength={120}
                      placeholder="Celular o correo (opcional)"
                      className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 outline-none placeholder:text-gray-400 focus:border-[#f5cc00]"
                    />
                  </div>
                )}
                {anonima && <input type="hidden" name="nombre" value="Anónimo" />}
                <div>
                  <textarea
                    name="mensaje"
                    required
                    minLength={10}
                    maxLength={1500}
                    rows={5}
                    onChange={(e) => setLargo(e.target.value.length)}
                    placeholder="Escribe tu petición…"
                    className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 outline-none placeholder:text-gray-400 focus:border-[#f5cc00]"
                  />
                  <p className="text-right text-xs text-gray-500">{largo}/1500</p>
                </div>
                {error && <p className="rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-200">{error}</p>}
                <button
                  type="submit"
                  disabled={pending}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#f5cc00] px-6 py-3 font-semibold text-black transition hover:bg-white disabled:opacity-60"
                >
                  <Send className="size-4" /> {pending ? 'Enviando…' : 'Enviar petición'}
                </button>
                <p className="text-center text-xs text-gray-500">Tu petición solo la ve el equipo de oración de la iglesia.</p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
