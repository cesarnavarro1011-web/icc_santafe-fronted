import type { WebMinisterio } from "@prisma/client";
import { ExternalLink, HeartHandshake, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/workspace/form-dialog";
import { EmptyState, Field, PageHeader } from "@/components/workspace/ui-kit";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { urlImagen } from "@/server/contenido";
import { guardarMinisterio } from "../actions";
import { AccionesContenido, EstadoPublicacionBadge, ImagenField, PublicacionFields } from "../campos";

function MinisterioFields({ m }: { m?: WebMinisterio }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nombre *">
        <Input name="nombre" defaultValue={m?.nombre} maxLength={100} required placeholder="Ej: Ministerio de Jóvenes" />
      </Field>
      <Field label="Dirección de su página">
        <Input name="slug" defaultValue={m?.slug ?? ""} placeholder="se genera del nombre (ej: jovenes)" />
      </Field>
      <Field label="Descripción *" className="sm:col-span-2">
        <Textarea name="descripcion" rows={4} defaultValue={m?.descripcion} required />
      </Field>
      <Field label="Dirigido a">
        <Input name="publico" defaultValue={m?.publico ?? ""} placeholder="Ej: Jóvenes de 13 a 25 años" />
      </Field>
      <Field label="Horario">
        <Input name="horario" defaultValue={m?.horario ?? ""} placeholder="Ej: Viernes 7:00 p. m." />
      </Field>
      <Field label="Lugar">
        <Input name="lugar" defaultValue={m?.lugar ?? ""} />
      </Field>
      <Field label="Líder">
        <Input name="lider" defaultValue={m?.lider ?? ""} />
      </Field>
      <Field label="Correo de contacto" className="sm:col-span-2">
        <Input name="correo" type="email" defaultValue={m?.correo ?? ""} />
      </Field>
      <ImagenField actual={m ? urlImagen(m) : null} />
      <PublicacionFields estado={m?.estado} programable={false} />
    </div>
  );
}

export default async function MinisteriosContenidoPage() {
  await requirePage(R.CONTENIDO);
  const ministerios = await prisma.webMinisterio.findMany({ orderBy: [{ orden: "asc" }, { nombre: "asc" }] });

  return (
    <>
      <PageHeader
        title="Ministerios"
        description="Cada ministerio tiene su tarjeta en la portada y su propia página con los detalles."
        actions={
          <FormDialog
            title="Nuevo ministerio"
            action={guardarMinisterio.bind(null, null)}
            successMessage="Ministerio guardado"
            trigger={
              <Button>
                <Plus /> Nuevo ministerio
              </Button>
            }
          >
            <MinisterioFields />
          </FormDialog>
        }
      />
      {ministerios.length === 0 ? (
        <EmptyState icon={HeartHandshake}>Aún no hay ministerios.</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ministerios.map((m) => {
            const img = urlImagen(m);
            return (
              <article key={m.id} className="bg-card flex flex-col overflow-hidden rounded-xl border shadow-sm">
                <div
                  className="flex h-28 items-end bg-gradient-to-br from-[#5a189a] to-[#0E34A0] bg-cover bg-center p-3 text-white"
                  style={img ? { backgroundImage: `linear-gradient(to top, rgba(0,0,0,.7), rgba(0,0,0,.1)), url("${img}")` } : undefined}
                >
                  <h3 className="text-lg font-bold">{m.nombre}</h3>
                </div>
                <div className="flex-1 space-y-1 p-3 text-xs">
                  <p className="text-muted-foreground line-clamp-2">{m.descripcion}</p>
                  {m.horario && <p>🕒 {m.horario}</p>}
                  {m.lider && <p>👤 {m.lider}</p>}
                </div>
                <div className="flex items-center justify-between gap-2 border-t p-3">
                  <EstadoPublicacionBadge estado={m.estado} />
                  <div className="flex gap-1">
                    <Button size="icon-sm" variant="ghost" asChild aria-label="Ver página">
                      <a href={`/ministerios/${m.slug}`} target="_blank" rel="noreferrer">
                        <ExternalLink />
                      </a>
                    </Button>
                    <FormDialog
                      title="Editar ministerio"
                      action={guardarMinisterio.bind(null, m.id)}
                      successMessage="Ministerio actualizado"
                      trigger={
                        <Button size="icon-sm" variant="outline" aria-label="Editar">
                          <Pencil />
                        </Button>
                      }
                    >
                      <MinisterioFields m={m} />
                    </FormDialog>
                    <AccionesContenido tabla="ministerio" id={m.id} estado={m.estado} nombre={m.nombre} ordenable />
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
