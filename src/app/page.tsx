import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/sections/Hero';
import EnVivoSection from '@/components/sections/EnVivoSection';
import AnuncioBar from '@/components/sections/AnuncioBar';
import EventsSection from '@/components/sections/EventsSection';
import MinistriesSection from '@/components/sections/MinistriesSection';
import OracionSection from '@/components/sections/OracionSection';
import SermonsSection from '@/components/sections/SermonsSection';
import { anunciosPublicos, envivoPublico, eventosPublicos, ministeriosPublicos, predicasPublicas, slidesPublicas } from '@/server/contenido';

// El contenido lo publica el Gestor de contenido desde el espacio de estudio
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [slides, anuncios, eventos, predicas, ministerios, envivo] = await Promise.all([
    slidesPublicas(),
    anunciosPublicos(),
    eventosPublicos(),
    predicasPublicas(),
    ministeriosPublicos(),
    envivoPublico(),
  ]);

  return (
    <>
      <Header />
      <main>
        <Hero slides={slides} envivo={envivo} />
        <EnVivoSection envivo={envivo} />
        <EventsSection eventos={eventos} />
        <SermonsSection predicas={predicas} />
        <MinistriesSection ministerios={ministerios} />
        <OracionSection />
      </main>
      <Footer />
      <AnuncioBar anuncios={anuncios} />
    </>
  );
}
