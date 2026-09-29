import type { WebSlide } from "@prisma/client";
import { ExternalLink, Image as ImageIcon, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/workspace/form-dialog";
import { EmptyState, Field, PageHeader } from "@/components/workspace/ui-kit";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { urlImagen } from "@/server/contenido";
import { guardarSlide } from "../actions";
import { AccionesContenido, EstadoPublicacionBadge, ImagenField, PublicacionFields } from "../campos";

function SlideFields({ s }: { s?: WebSlide }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Título *" className="sm:col-span-2">
        <Input name="titulo" defaultValue={s?.titulo} maxLength={120} required placeholder="Ej: Bienvenidos a nuestra familia" />
      </Field>
      <Field label="Texto pequeño arriba del título">
        <Input name="subtitulo" defaultValue={s?.subtitulo ?? ""} placeholder="Ej: Cada domingo a las 10:00 a. m." />
      </Field>
      <Field label="Texto del botón">
        <Input name="ctaTexto" defaultValue={s?.ctaTexto ?? ""} placeholder="Ej: Conócenos" />
      </Field>
      <Field label="Descripción" className="sm:col-span-2">
        <Textarea name="descripcion" rows={2} defaultValue={s?.descripcion ?? ""} />
      </Field>
      <Field label="Enlace del botón" className="sm:col-span-2">
        <Input name="ctaLink" defaultValue={s?.ctaLink ?? ""} placeholder="/#eventos, /nosotros o https://…" />
      </Field>
      <ImagenField actual={s ? urlImagen(s) : null} ayuda="Horizontal y de buena calidad (ideal 1920×1080). JPG, PNG o WebP, máx. 5 MB." />
      <PublicacionFields estado={s?.estado} desde={s?.publicarDesde} hasta={s?.publicarHasta} />
    </div>
  );
}

export default async function PortadaPage() {
  await requirePage(R.CONTENIDO);
  const slides = await prisma.webSlide.findMany({ orderBy: [{ orden: "asc" }, { createdAt: "asc" }] });

  return (
    <>
      <PageHeader
        title="Portada"
        description="Las diapositivas del carrusel principal. Se muestran en este orden y cambian solas cada 6 segundos."
        actions={
          <>
            <Button variant="outline" asChild>
              <a href="/" target="_blank" rel="noreferrer">
                <ExternalLink /> Ver página
              </a>
            </Button>
            <FormDialog
              title="Nueva diapositiva"
              action={guardarSlide.bind(null, null)}
              successMessage="Diapositiva guardada"
              trigger={
                <Button>
                  <Plus /> Nueva diapositiva
                </Button>
              }
            >
              <SlideFields />
            </FormDialog>
          </>
        }
      />
      {slides.length === 0 ? (
        <EmptyState icon={ImageIcon}>Aún no hay diapositivas. La portada mostrará un mensaje de bienvenida genérico.</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {slides.map((s, i) => {
            const img = urlImagen(s);
            return (
              <article key={s.id} className="bg-card overflow-hidden rounded-xl border shadow-sm">
                <div
                  className="relative flex aspect-video flex-col justify-end bg-gradient-to-br from-[#5a189a] to-[#0E34A0] bg-cover bg-center p-4 text-white"
                  style={img ? { backgroundImage: `linear-gradient(to top, rgba(0,0,0,.75), rgba(0,0,0,.1)), url("${img}")` } : undefined}
                >
                  <span className="absolute top-2 left-2 rounded bg-black/50 px-2 py-0.5 text-xs font-bold">#{i + 1}</span>
                  {s.subtitulo && <p className="text-[10px] font-semibold tracking-wider text-[#f5cc00] uppercase">{s.subtitulo}</p>}
                  <h3 className="line-clamp-2 text-lg leading-tight font-bold">{s.titulo}</h3>
                  {s.ctaTexto && <span className="mt-2 w-fit rounded-full bg-white px-3 py-0.5 text-xs font-semibold text-black">{s.ctaTexto}</span>}
                </div>
                <div className="flex items-center justify-between gap-2 p-3">
                  <EstadoPublicacionBadge estado={s.estado} desde={s.publicarDesde} hasta={s.publicarHasta} />
                  <div className="flex gap-1">
                    <FormDialog
                      title="Editar diapositiva"
                      action={guardarSlide.bind(null, s.id)}
                      successMessage="Diapositiva actualizada"
                      trigger={
                        <Button size="icon-sm" variant="outline" aria-label="Editar">
                          <Pencil />
                        </Button>
                      }
                    >
                      <SlideFields s={s} />
                    </FormDialog>
                    <AccionesContenido tabla="slide" id={s.id} estado={s.estado} nombre={s.titulo} ordenable />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
