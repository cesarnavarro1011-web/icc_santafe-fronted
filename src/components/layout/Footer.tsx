import Link from 'next/link';
import Image from 'next/image';
import { Phone, Mail, MapPin, Facebook, Instagram, Youtube, MessageCircle, Music2 } from 'lucide-react';
import { ministeriosPublicos, sitioPublico } from '@/server/contenido';

// Los datos de contacto, redes y ministerios se editan en el espacio de estudio:
// Página web → Datos de la iglesia / Ministerios.
export default async function Footer() {
  const [sitio, ministerios] = await Promise.all([sitioPublico(), ministeriosPublicos()]);
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { href: '/nosotros', label: 'Quiénes Somos' },
    { href: '/eventos', label: 'Eventos' },
    { href: '/ministerios', label: 'Ministerios' },
    { href: '/predicaciones', label: 'Predicaciones' },
    { href: '/contactanos', label: 'Contacto' },
  ];

  const redes = [
    { href: sitio.redes.facebook, label: 'Facebook', icon: Facebook, color: 'hover:text-blue-400' },
    { href: sitio.redes.instagram, label: 'Instagram', icon: Instagram, color: 'hover:text-pink-400' },
    { href: sitio.redes.youtube, label: 'YouTube', icon: Youtube, color: 'hover:text-red-400' },
    { href: sitio.redes.tiktok, label: 'TikTok', icon: Music2, color: 'hover:text-white' },
    { href: sitio.whatsappUrl, label: 'WhatsApp', icon: MessageCircle, color: 'hover:text-green-400' },
  ].filter((r): r is typeof r & { href: string } => !!r.href);

  return (
    <footer className="bg-black text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo y Descripción */}
          <div className="col-span-1 lg:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <span className="relative h-12 w-12 rounded-md overflow-hidden ring-1 ring-white/10 shadow-sm shadow-black/30 flex-shrink-0">
                <Image src="/images/logo.jpg" alt={`Logo ${sitio.nombre}`} fill sizes="100px" className="object-cover" priority />
              </span>
              <div>
                <h3 className="text-xl font-bold">{sitio.nombre}</h3>
                {sitio.lema && <p className="text-gray-400 text-sm">{sitio.lema}</p>}
              </div>
            </div>
            {sitio.descripcion && <p className="text-gray-300 mb-6 max-w-md">{sitio.descripcion}</p>}

            {/* Información de Contacto (solo lo que esté registrado) */}
            <div className="space-y-3">
              {sitio.direccion && (
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-blue-400 flex-shrink-0" />
                  <p className="text-gray-300">
                    {sitio.mapaUrl ? (
                      <a href={sitio.mapaUrl} target="_blank" rel="noreferrer" className="hover:text-white">
                        {sitio.direccion}
                        {sitio.ciudad && `, ${sitio.ciudad}`}
                      </a>
                    ) : (
                      <>
                        {sitio.direccion}
                        {sitio.ciudad && `, ${sitio.ciudad}`}
                      </>
                    )}
                  </p>
                </div>
              )}
              {sitio.telefono && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-blue-400 flex-shrink-0" />
                  <a href={`tel:${sitio.telefono.replace(/[^\d+]/g, '')}`} className="text-gray-300 hover:text-white">
                    {sitio.telefono}
                  </a>
                </div>
              )}
              {sitio.correo && (
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-blue-400 flex-shrink-0" />
                  <a href={`mailto:${sitio.correo}`} className="text-gray-300 hover:text-white">
                    {sitio.correo}
                  </a>
                </div>
              )}
            </div>

            {/* Redes Sociales */}
            {redes.length > 0 && (
              <div className="flex space-x-4 mt-6">
                {redes.map((r) => (
                  <a key={r.label} href={r.href} target="_blank" rel="noreferrer" aria-label={r.label} title={r.label} className={`text-gray-400 transition-colors ${r.color}`}>
                    <r.icon className="h-6 w-6" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Enlaces Rápidos */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Enlaces Rápidos</h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-gray-300 hover:text-white transition-colors duration-200">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Ministerios publicados */}
          {ministerios.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold mb-4">Ministerios</h4>
              <ul className="space-y-2">
                {ministerios.slice(0, 5).map((m) => (
                  <li key={m.id}>
                    <Link href={`/ministerios/${m.slug}`} className="text-gray-300 hover:text-white transition-colors duration-200">
                      {m.nombre}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400">
            © {currentYear} {sitio.nombre}. Todos los derechos reservados.
          </p>
          <p className="text-gray-400">Created by César Navarro Developer.</p>
        </div>
      </div>
    </footer>
  );
}
