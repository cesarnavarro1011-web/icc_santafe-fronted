'use client';

import { useState, type ReactNode } from 'react';
import Header from '@/components/layout/Header';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageCircle,
  Send,
  Facebook,
  Instagram,
  Youtube,
  Music2,
  CheckCircle,
  Navigation,
} from 'lucide-react';
import Link from 'next/link';
import type { SitioPublico } from '@/server/contenido';

/** Página de contacto. Los datos (teléfono, correo, horarios…) vienen de "Datos de la iglesia". */
export default function ContactoCliente({ sitio, footer }: { sitio: SitioPublico; footer: ReactNode }) {
  // Lo que se busca en Google Maps: dirección + ciudad (sin ciudad, Maps puede ubicar otra "Carrera 43")
  // El mapa se guía por el nombre del lugar en Google Maps (la dirección escrita lo descentraba)
  const consultaMapa = [sitio.nombre, sitio.ciudad].filter(Boolean).join(", ");
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    type: 'general' // general, prayer, counseling, event
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const contactReasons = [
    { value: 'general', label: 'Consulta General' },
    { value: 'prayer', label: 'Petición de Oración' },
    { value: 'counseling', label: 'Consejería Espiritual' },
    { value: 'event', label: 'Información sobre Eventos' },
    { value: 'ministry', label: 'Unirse a un Ministerio' },
    { value: 'visit', label: 'Primera Visita' }
  ];

  const redes = [
    { href: sitio.redes.facebook, label: 'Facebook', icon: Facebook, color: 'text-blue-600 hover:text-blue-800' },
    { href: sitio.redes.instagram, label: 'Instagram', icon: Instagram, color: 'text-pink-600 hover:text-pink-800' },
    { href: sitio.redes.youtube, label: 'YouTube', icon: Youtube, color: 'text-red-600 hover:text-red-800' },
    { href: sitio.redes.tiktok, label: 'TikTok', icon: Music2, color: 'text-gray-900 hover:text-black' },
    { href: sitio.whatsappUrl, label: 'WhatsApp', icon: MessageCircle, color: 'text-green-600 hover:text-green-800' },
  ].filter((r): r is typeof r & { href: string } => !!r.href);

  const tieneContacto = sitio.direccion || sitio.telefono || sitio.correo || sitio.whatsapp;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Aquí iría la lógica para enviar los datos al backend
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error al enviar el formulario:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <>
        <Header />
        <main className="py-16 bg-gray-50 min-h-screen flex items-center">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <div className="bg-white rounded-lg shadow-md p-8">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-6" />
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  ¡Mensaje Enviado!
                </h1>
                <p className="text-lg text-gray-600 mb-6">
                  Gracias por contactarnos. Hemos recibido tu mensaje y nos pondremos en contacto contigo pronto.
                </p>
                  <Link
                    href="/"
                    className="bg-blue-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors duration-200 inline-block"
                  >
                    Volver al Inicio
                  </Link>
                </div>
              </div>
            </div>
        </main>
        {footer}
      </>
    );
  }

  return (
    <>
      <Header />
      <main>
        {/* Hero Section */}
        {/* pt extra: el menú superior es fijo y tapaba el título */}
        <section
          className="relative isolate overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 bg-cover bg-center pt-32 pb-16 text-white md:pt-36 md:pb-20"
          style={
            sitio.contactoImagen
              ? { backgroundImage: `linear-gradient(to right, rgba(15,23,42,.8), rgba(59,7,100,.55)), url("${sitio.contactoImagen}")` }
              : undefined
          }
        >
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Estamos Aquí Para Ti
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto">
                No dudes en contactarnos. Estaremos encantados de responder tus preguntas y acompañarte en tu crecimiento espiritual.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Content */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

              {/* Contact Form */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-md p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Envíanos un Mensaje
                  </h2>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Personal Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                          Nombre Completo *
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Tu nombre completo"
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                          Correo Electrónico *
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="tu@email.com"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                          Teléfono (Opcional)
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Ej: 301 000 0000"
                        />
                      </div>
                      <div>
                        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                          Motivo de Contacto
                        </label>
                        <select
                          id="type"
                          name="type"
                          value={formData.type}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {contactReasons.map((reason) => (
                            <option key={reason.value} value={reason.value}>
                              {reason.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                        Asunto
                      </label>
                      <input
                        type="text"
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Breve descripción del tema"
                      />
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                        Mensaje *
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        rows={5}
                        required
                        value={formData.message}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Escribe tu mensaje aquí..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-blue-600 text-white py-3 px-6 rounded-md font-semibold hover:bg-blue-700 disabled:bg-blue-400 transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5" />
                          <span>Enviar Mensaje</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Contact Info Sidebar */}
              <div className="space-y-6">

                {/* Contact Details */}
                {tieneContacto && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Información de Contacto
                    </h3>
                    <div className="space-y-4">
                      {sitio.direccion && (
                        <div className="flex items-start space-x-3">
                          <MapPin className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900">Dirección</p>
                            <p className="text-gray-600">
                              {sitio.direccion}
                              {sitio.ciudad && <><br />{sitio.ciudad}</>}
                            </p>
                          </div>
                        </div>
                      )}
                      {sitio.telefono && (
                        <div className="flex items-start space-x-3">
                          <Phone className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900">Teléfono</p>
                            <a href={`tel:${sitio.telefono.replace(/[^\d+]/g, '')}`} className="text-gray-600 hover:text-blue-700">
                              {sitio.telefono}
                            </a>
                          </div>
                        </div>
                      )}
                      {sitio.correo && (
                        <div className="flex items-start space-x-3">
                          <Mail className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900">Email</p>
                            <a href={`mailto:${sitio.correo}`} className="text-gray-600 hover:text-blue-700 break-all">
                              {sitio.correo}
                            </a>
                          </div>
                        </div>
                      )}
                      {sitio.whatsapp && (
                        <div className="flex items-start space-x-3">
                          <MessageCircle className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900">WhatsApp</p>
                            {sitio.whatsappUrl ? (
                              <a href={sitio.whatsappUrl} target="_blank" rel="noreferrer" className="text-gray-600 hover:text-green-700">
                                {sitio.whatsapp}
                              </a>
                            ) : (
                              <p className="text-gray-600">{sitio.whatsapp}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Schedules */}
                {sitio.horarios.length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Clock className="h-5 w-5 text-blue-600 mr-2" />
                      Horarios de Servicio
                    </h3>
                    <div className="space-y-3">
                      {sitio.horarios.map((h, index) => (
                        <div key={index} className="border-l-2 border-blue-200 pl-3">
                          <p className="font-medium text-gray-900">{h.dia}</p>
                          {h.detalle.map((d, i) => (
                            <p key={i} className="text-sm text-gray-600">{d}</p>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social Media */}
                {redes.length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Síguenos en Redes Sociales
                    </h3>
                    <div className="flex space-x-4">
                      {redes.map((r) => (
                        <a key={r.label} href={r.href} target="_blank" rel="noreferrer" title={r.label} aria-label={r.label} className={`transition-colors ${r.color}`}>
                          <r.icon className="h-6 w-6" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emergency Contact */}
                {sitio.emergencias && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h4 className="font-semibold text-red-900 mb-2">
                      Emergencias Pastorales
                    </h4>
                    <p className="text-red-700 text-sm mb-3">
                      Para situaciones urgentes fuera de horario de oficina.
                    </p>
                    <a href={`tel:${sitio.emergencias.replace(/[^\d+]/g, '')}`} className="text-red-800 font-medium">
                      {sitio.emergencias}
                    </a>
                    <p className="text-red-700 text-xs mt-1">Solo emergencias</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Map Section */}
        {sitio.direccion && (
          <section className="py-12 bg-white">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
                Cómo Llegar
              </h2>
              {/* Mapa de Google incrustado a partir de la dirección (no requiere clave de API) */}
              <div className="overflow-hidden rounded-lg border shadow-sm">
                <iframe
                  title={`Mapa: ${sitio.direccion}`}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(consultaMapa)}&z=16&hl=es&output=embed`}
                  className="h-96 w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
              <div className="mt-6 flex flex-col items-center gap-3 text-center text-gray-700 sm:flex-row sm:justify-center">
                <p className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">{sitio.direccion}</span>
                  {sitio.ciudad && <span className="text-gray-500">· {sitio.ciudad}</span>}
                </p>
                <a
                  href={sitio.mapaUrl || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(consultaMapa)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
                >
                  <Navigation className="h-5 w-5" /> Cómo llegar con Google Maps
                </a>
                <a
                  href={`https://waze.com/ul?q=${encodeURIComponent(consultaMapa)}&navigate=yes`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#33ccff] px-6 py-3 font-semibold text-white hover:bg-[#1fb8eb]"
                >
                  <Navigation className="h-5 w-5" /> Ir con Waze
                </a>
              </div>
            </div>
          </section>
        )}
      </main>
      {footer}
    </>
  );
}
