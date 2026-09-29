import Link from "next/link";
import { CalendarDays, ExternalLink, Eye, HandHeart, HeartHandshake, Image as ImageIcon, Megaphone, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiCard, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { fecha } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { anuncioPublico, eventosPublicos, slidesPublicas } from "@/server/contenido";

const SECCIONES = [
  { href: "/workspace/contenido/portada", icon: ImageIcon, titulo: "Portada", texto: "Carrusel principal con imágenes y botones" },
  { href: "/workspace/contenido/anuncios", icon: Megaphone, titulo: "Anuncios", texto: "Barra destacada con fechas de inicio y fin" },
  { href: "/workspace/contenido/eventos", icon: CalendarDays, titulo: "Eventos", texto: "Próximas actividades; se agregan al calendario" },
  { href: "/workspace/contenido/predicas", icon: Video, titulo: "Prédicas", texto: "Videos de YouTube o Vimeo dentro de la página" },
  { href: "/workspace/contenido/ministerios", icon: HeartHandshake, titulo: "Ministerios", texto: "Tarjetas y página de cada ministerio" },
  { href: "/workspace/contenido/peticiones", icon: HandHeart, titulo: "Peticiones de oración", texto: "Lo que envían los visitantes" },
];

export default async function ContenidoPage() {
  await requirePage(R.CONTENIDO);
  const [slides, anuncio, eventos, predicas, ministerios, peticionesNuevas, borradores, recientes] = await Promise.all([
    slidesPublicas(),
    anuncioPublico(),
    eventosPublicos(),
    prisma.webPredica.aggregate({ where: { estado: "PUBLICADO" }, _count: true, _sum: { vistas: true } }),
    prisma.webMinisterio.count({ where: { estado: "PUBLICADO" } }),
    prisma.peticionOracion.count({ where: { estado: "NUEVA" } }),
    Promise.all([
      prisma.webSlide.count({ where: { estado: "BORRADOR" } }),
      prisma.webEvento.count({ where: { estado: "BORRADOR" } }),
      prisma.webPredica.count({ where: { estado: "BORRADOR" } }),
      prisma.webMinisterio.count({ where: { estado: "BORRADOR" } }),
    ]).then((xs) => xs.reduce((a, b) => a + b, 0)),
    prisma.webPredica.findFirst({ where: { estado: "PUBLICADO" }, orderBy: { fecha: "desc" } }),
  ]);

  const alertas = [
    slides.length === 0 && "La portada no tiene diapositivas publicadas: se muestra un mensaje genérico.",
    eventos.length === 0 && "No hay eventos próximos publicados.",
    recientes && Date.now() - recientes.fecha.getTime() > 14 * 86_400_000 && `La última prédica es del ${fecha(recientes.fecha)}. ¡Sube la más reciente!`,
    peticionesNuevas > 0 && `Hay ${peticionesNuevas} peticiones de oración nuevas esperando al equipo.`,
  ].filter(Boolean) as string[];

  return (
    <>
      <PageHeader
        title="Página web"
        description="Mantén viva la página de la iglesia: todo lo que publiques aquí se ve al instante."
        actions={
          <Button asChild>
            <a href="/" target="_blank" rel="noreferrer">
              <ExternalLink /> Ver página
            </a>
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={ImageIcon} label="Diapositivas en portada" value={slides.length} color="violet" sub={anuncio ? "Con anuncio activo" : "Sin anuncio activo"} />
        <KpiCard icon={CalendarDays} label="Eventos próximos" value={eventos.length} color="blue" />
        <KpiCard icon={Eye} label="Vistas de prédicas" value={predicas._sum.vistas ?? 0} color="green" sub={`${predicas._count} prédicas publicadas`} />
        <KpiCard icon={HandHeart} label="Peticiones nuevas" value={peticionesNuevas} color={peticionesNuevas ? "amber" : "slate"} sub={`${ministerios} ministerios · ${borradores} borradores`} />
      </div>
      {alertas.length > 0 && (
        <Panel title="Para mantener la página al día">
          <ul className="space-y-2 text-sm">
            {alertas.map((a) => (
              <li key={a} className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
                <span>•</span> {a}
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {SECCIONES.map((s) => (
          <Link key={s.href} href={s.href} className="bg-card hover:bg-accent flex items-start gap-3 rounded-xl border p-4 transition">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
              <s.icon className="size-5" />
            </span>
            <span>
              <span className="block font-semibold">{s.titulo}</span>
              <span className="text-muted-foreground text-sm">{s.texto}</span>
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
