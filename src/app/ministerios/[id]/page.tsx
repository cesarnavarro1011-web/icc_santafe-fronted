import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, Clock, HeartHandshake, Mail, MapPin, User, Users } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ministerioPublico, ministeriosPublicos } from '@/server/contenido';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const m = await ministerioPublico((await params).id);
  return m ? { title: `${m.nombre} · Iglesia Cuadrangular Santa Fe`, description: m.descripcion.slice(0, 160) } : {};
}

export default async function MinisterioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await ministerioPublico(id);
  if (!m) notFound();
  const otros = (await ministeriosPublicos()).filter((x) => x.id !== m.id).slice(0, 3);

  const datos = [
    { icono: Users, titulo: 'Dirigido a', valor: m.publico },
    { icono: Clock, titulo: 'Horario', valor: m.horario },
    { icono: MapPin, titulo: 'Lugar', valor: m.lugar },
    { icono: User, titulo: 'Líder', valor: m.lider },
  ].filter((d) => d.valor);

  return (
    <>
      <Header />
      <main className="bg-white">
        <section className="relative flex min-h-[60vh] items-end overflow-hidden bg-gradient-to-br from-[#5a189a] to-[#0E34A0] pt-32 pb-12 text-white">
          {m.imagen && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.imagen} alt={m.nombre} className="absolute inset-0 h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
          <div className="relative mx-auto w-full max-w-5xl px-4 md:px-8">
            <Link href="/#ministerios" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-300 hover:text-white">
              <ArrowLeft className="size-4" /> Todos los ministerios
            </Link>
            <h1 className="text-4xl font-bold md:text-6xl">{m.nombre}</h1>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-10 px-4 py-14 md:grid-cols-3 md:px-8">
          <div className="md:col-span-2">
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-gray-900">
              <HeartHandshake className="size-6 text-[#5a189a]" /> Sobre este ministerio
            </h2>
            <p className="text-lg leading-relaxed whitespace-pre-line text-gray-700">{m.descripcion}</p>
          </div>
          <aside className="h-fit space-y-4 rounded-3xl bg-gray-50 p-6">
            {datos.map((d) => (
              <div key={d.titulo} className="flex gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#5a189a] shadow-sm">
                  <d.icono className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">{d.titulo}</p>
                  <p className="font-medium text-gray-900">{d.valor}</p>
                </div>
              </div>
            ))}
            {m.correo && (
              <a
                href={`mailto:${m.correo}?subject=${encodeURIComponent(`Quiero saber más de ${m.nombre}`)}`}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0b0b0d] px-5 py-3 font-semibold text-white transition hover:bg-[#5a189a]"
              >
                <Mail className="size-4" /> Quiero unirme
              </a>
            )}
          </aside>
        </section>

        {otros.length > 0 && (
          <section className="bg-gray-50 py-14">
            <div className="mx-auto max-w-5xl px-4 md:px-8">
              <h2 className="mb-6 text-2xl font-bold text-gray-900">Otros ministerios</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {otros.map((o) => (
                  <Link key={o.id} href={`/ministerios/${o.slug}`} className="group relative flex h-40 items-end overflow-hidden rounded-2xl bg-gradient-to-br from-[#5a189a] to-[#0E34A0] p-4 text-white">
                    {o.imagen && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={o.imagen} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <span className="relative font-bold">{o.nombre}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
