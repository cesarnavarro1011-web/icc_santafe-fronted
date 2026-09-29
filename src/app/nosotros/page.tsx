import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AboutSection from '@/components/sections/AboutSection';
import TestimonialsSection from '@/components/sections/TestimonialsSection';
import { SimpleBreadcrumbs } from '@/components/ui/Breadcrumbs';
import Image from 'next/image';
import { UserRound } from "lucide-react";
import CifrasAnimadas from '@/components/sections/CifrasAnimadas';
import { historiaPublica, personasPublicas, sitioPublico } from '@/server/contenido';

// Todo el contenido se edita en el espacio de estudio: Página web → Datos de la iglesia
export const dynamic = 'force-dynamic';

/** "Nuestra Historia, Nuestra Fe" → la parte después de la última coma va resaltada. */
function TituloResaltado({ texto }: { texto: string }) {
  const i = texto.lastIndexOf(',');
  if (i < 0) return <>{texto}</>;
  return (
    <>
      {texto.slice(0, i + 1)}{' '}
      <span className="bg-gradient-to-r from-blue-400 to-purple-300 bg-clip-text text-transparent">{texto.slice(i + 1).trim()}</span>
    </>
  );
}

export default async function NosotrosPage() {
  const [sitio, historia, personas] = await Promise.all([sitioPublico(), historiaPublica(), personasPublicas()]);
  const n = sitio.nosotros;

  return (
    <>
      <Header />
      <SimpleBreadcrumbs current="Quiénes Somos" />
      <main>
        {/* Hero Section */}
        <section className="relative isolate overflow-hidden text-white py-24 md:py-28">
          {/* Imagen de fondo: la subida en "Datos de la iglesia" o la foto por defecto */}
          <Image
            src={n.imagen ?? "/images/hero1.jpg"}
            alt="Nuestra congregación"
            fill
            priority
            unoptimized={!!n.imagen}
            className="object-cover object-center absolute inset-0 -z-20"
          />
          {/* Capa degradado oscura para legibilidad */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
          {/* Decoración ligera (blur) */}
          <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-600/30 blur-3xl -z-10" />
          <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-purple-700/30 blur-3xl -z-10" />
          <div className="relative container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <span className="inline-block mb-4 rounded-full border border-white/20 bg-white/10 backdrop-blur px-4 py-1 text-xs font-semibold tracking-wider uppercase">Quiénes Somos</span>
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                <TituloResaltado texto={n.titulo || sitio.nombre} />
              </h1>
              {n.texto && <p className="text-lg md:text-2xl text-gray-200/90 leading-relaxed">{n.texto}</p>}
              {(historia.length > 0 || personas.equipo.length > 0) && (
                <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                  {historia.length > 0 && (
                    <a href="#historia" className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold bg-white text-gray-900 shadow-md shadow-black/30 hover:shadow-lg hover:bg-blue-50 transition">
                      Ver Historia
                    </a>
                  )}
                  {personas.equipo.length > 0 && (
                    <a href="#equipo" className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-md shadow-black/30 transition">
                      Nuestro Equipo
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <AboutSection
          mision={n.mision}
          vision={n.vision}
          valores={n.valores}
          fundadores={personas.fundadores}
          actuales={personas.actuales}
        />

        {/* Estadísticas */}
        {n.estadisticas.length > 0 && (
          <div className="container mx-auto px-4 relative mt-48 md:mt-0">
            <div className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 bg-black rounded-xl p-6 md:p-8 text-white">
              {/* Aparecen y cuentan desde 0 al hacer scroll */}
              <CifrasAnimadas cifras={n.estadisticas} />
            </div>
          </div>
        )}

        {/* Historia Section */}
        {historia.length > 0 && (
          <section id="historia" className="py-16 bg-white scroll-mt-24">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
                  Nuestra Historia
                </h2>

                <div className="space-y-12">
                  {historia.map((h, i) => (
                    <div key={h.id} className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      <div className={i % 2 === 1 ? 'md:order-2' : ''}>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">
                          {h.titulo}
                          {h.periodo && <span className="text-gray-500 font-medium"> ({h.periodo})</span>}
                        </h3>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-line">{h.texto}</p>
                      </div>
                      {h.imagen ? (
                        <div className={`relative h-64 overflow-hidden rounded-lg ${i % 2 === 1 ? 'md:order-1' : ''}`}>
                          <Image src={h.imagen} alt={h.titulo} fill sizes="(min-width: 768px) 448px, 100vw" className="object-cover" unoptimized={h.imagen.startsWith('/api/')} />
                        </div>
                      ) : (
                        <div className={`hidden md:block ${i % 2 === 1 ? 'md:order-1' : ''}`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Equipo pastoral */}
        {personas.equipo.length > 0 && (
          <section id="equipo" className="py-16 bg-gray-50 scroll-mt-24">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
                Nuestro Equipo Pastoral
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {personas.equipo.map((p) => (
                  <div key={p.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="relative bg-gray-200 h-64">
                      {p.imagen ? (
                        <Image src={p.imagen} alt={p.nombre} fill sizes="(min-width: 1024px) 384px, 100vw" className="object-cover" unoptimized={p.imagen.startsWith('/api/')} />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <UserRound className="h-20 w-20 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{p.nombre}</h3>
                      {p.cargo && <p className="text-blue-600 font-medium mb-3">{p.cargo}</p>}
                      {p.descripcion && <p className="text-gray-600 text-sm">{p.descripcion}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <TestimonialsSection />
      </main>
      <Footer />
    </>
  );
}
