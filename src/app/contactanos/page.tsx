import Footer from '@/components/layout/Footer';
import { sitioPublico } from '@/server/contenido';
import ContactoCliente from './contacto-cliente';

// Los datos de contacto se editan en el espacio de estudio: Página web → Datos de la iglesia
export const dynamic = 'force-dynamic';

export default async function ContactanosPage() {
  const sitio = await sitioPublico();
  return <ContactoCliente sitio={sitio} footer={<Footer />} />;
}
