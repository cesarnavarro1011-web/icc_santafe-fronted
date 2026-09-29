import type { WebAnuncio } from "@prisma/client";
import { Megaphone, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { FormDialog } from "@/components/workspace/form-dialog";
import { EmptyState, Field, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { COLORES_ANUNCIO } from "@/components/sections/anuncio-colores";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { cn } from "@/lib/utils";
import { guardarAnuncio } from "../actions";
import { AccionesContenido, EstadoPublicacionBadge, PublicacionFields } from "../campos";

function AnuncioFields({ a }: { a?: WebAnuncio }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Anuncio *" className="sm:col-span-2">
        <Input name="texto" defaultValue={a?.texto} maxLength={200} required placeholder="Ej: ¡Este domingo celebramos la Santa Cena!" />
      </Field>
      <Field label="Texto del enlace (opcional)">
        <Input name="textoEnlace" defaultValue={a?.textoEnlace ?? ""} placeholder="Ej: Ver detalles" />
      </Field>
      <Field label="Enlace (opcional)">
        <Input name="enlace" defaultValue={a?.enlace ?? ""} placeholder="/#eventos o https://…" />
      </Field>
      <Field label="Color">
        <NativeSelect name="color" defaultValue={a?.color ?? "violeta"}>
          {Object.entries(COLORES_ANUNCIO).map(([k, v]) => (
            <option key={k} value={k}>
              {v.nombre}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <PublicacionFields estado={a?.estado} desde={a?.publicarDesde} hasta={a?.publicarHasta} />
      <p className="text-muted-foreground text-xs sm:col-span-2">Solo se muestra un anuncio a la vez: el vigente modificado más recientemente.</p>
    </div>
  );
}

export default async function AnunciosPage() {
  await requirePage(R.CONTENIDO);
  const anuncios = await prisma.webAnuncio.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <>
      <PageHeader
        title="Anuncios"
        description="Una barra llamativa en la parte superior de la página, que el visitante puede cerrar."
        actions={
          <FormDialog
            title="Nuevo anuncio"
            action={guardarAnuncio.bind(null, null)}
            successMessage="Anuncio guardado"
            trigger={
              <Button>
                <Plus /> Nuevo anuncio
              </Button>
            }
          >
            <AnuncioFields />
          </FormDialog>
        }
      />
      <Panel>
        {anuncios.length === 0 ? (
          <EmptyState icon={Megaphone}>Sin anuncios.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {anuncios.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3">
                <div className={cn("min-w-0 flex-1 rounded-lg px-4 py-2.5 text-sm font-medium", COLORES_ANUNCIO[a.color as keyof typeof COLORES_ANUNCIO]?.clases ?? COLORES_ANUNCIO.violeta.clases)}>
                  {a.texto}
                  {a.textoEnlace && <span className="ml-2 underline">{a.textoEnlace} →</span>}
                </div>
                <EstadoPublicacionBadge estado={a.estado} desde={a.publicarDesde} hasta={a.publicarHasta} />
                <div className="flex gap-1">
                  <FormDialog
                    title="Editar anuncio"
                    action={guardarAnuncio.bind(null, a.id)}
                    successMessage="Anuncio actualizado"
                    trigger={
                      <Button size="icon-sm" variant="outline" aria-label="Editar">
                        <Pencil />
                      </Button>
                    }
                  >
                    <AnuncioFields a={a} />
                  </FormDialog>
                  <AccionesContenido tabla="anuncio" id={a.id} estado={a.estado} nombre={a.texto.slice(0, 40)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
