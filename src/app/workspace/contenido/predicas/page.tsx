import type { WebPredica } from "@prisma/client";
import { Eye, Pencil, Plus, Star, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/workspace/form-dialog";
import { EmptyState, Field, KpiCard, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { fecha, isoDate } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { idYoutube, urlImagen } from "@/server/contenido";
import { guardarPredica } from "../actions";
import { AccionesContenido, EstadoPublicacionBadge, ImagenField, PublicacionFields } from "../campos";

function miniatura(p: WebPredica) {
  if (p.imagenPath) return urlImagen(p);
  const yt = idYoutube(p.videoUrl);
  return yt ? `https://i.ytimg.com/vi/${yt}/mqdefault.jpg` : null;
}

function PredicaFields({ p, series }: { p?: WebPredica; series: string[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Enlace del video (YouTube o Vimeo) *" className="sm:col-span-2">
        <Input name="videoUrl" type="url" defaultValue={p?.videoUrl} required placeholder="https://www.youtube.com/watch?v=…" />
      </Field>
      <Field label="Título *" className="sm:col-span-2">
        <Input name="titulo" defaultValue={p?.titulo} maxLength={150} required />
      </Field>
      <Field label="Predicador *">
        <Input name="predicador" defaultValue={p?.predicador} required placeholder="Ej: Pastor Hernando Rincón" />
      </Field>
      <Field label="Fecha *">
        <Input name="fecha" type="date" defaultValue={isoDate(p?.fecha ?? new Date())} required />
      </Field>
      <Field label="Serie (opcional)">
        <Input name="serie" defaultValue={p?.serie ?? ""} list="series-predicas" placeholder="Ej: Fundamentos de la fe" />
        <datalist id="series-predicas">
          {series.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </Field>
      <Field label="Etiquetas (separadas por coma)">
        <Input name="etiquetas" defaultValue={p?.etiquetas.join(", ")} placeholder="fe, oración, familia" />
      </Field>
      <Field label="Descripción" className="sm:col-span-2">
        <Textarea name="descripcion" rows={3} defaultValue={p?.descripcion ?? ""} />
      </Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="destacada" defaultChecked={p?.destacada} className="size-4 accent-violet-600" /> Destacada (se muestra grande en la página)
      </label>
      <ImagenField actual={p?.imagenPath ? urlImagen(p) : null} etiqueta="Miniatura propia (opcional)" ayuda="Si no subes una, se usa automáticamente la de YouTube." />
      <PublicacionFields estado={p?.estado} programable={false} />
    </div>
  );
}

export default async function PredicasContenidoPage() {
  await requirePage(R.CONTENIDO);
  const predicas = await prisma.webPredica.findMany({ orderBy: { fecha: "desc" } });
  const series = [...new Set(predicas.map((p) => p.serie).filter((s): s is string => !!s))];
  const vistas = predicas.reduce((s, p) => s + p.vistas, 0);
  const masVista = [...predicas].sort((a, b) => b.vistas - a.vistas)[0];

  return (
    <>
      <PageHeader
        title="Prédicas"
        description="Pega el enlace de YouTube o Vimeo: los visitantes las ven dentro de la página, buscan y filtran por serie."
        actions={
          <FormDialog
            title="Nueva prédica"
            action={guardarPredica.bind(null, null)}
            successMessage="Prédica guardada"
            trigger={
              <Button>
                <Plus /> Nueva prédica
              </Button>
            }
          >
            <PredicaFields series={series} />
          </FormDialog>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard icon={Video} label="Prédicas publicadas" value={predicas.filter((p) => p.estado === "PUBLICADO").length} color="violet" />
        <KpiCard icon={Eye} label="Vistas totales" value={vistas} color="blue" />
        <KpiCard icon={Star} label="Más vista" value={masVista?.vistas ?? 0} color="amber" sub={masVista?.titulo ?? "—"} />
      </div>
      <Panel>
        {predicas.length === 0 ? (
          <EmptyState icon={Video}>Aún no hay prédicas.</EmptyState>
        ) : (
          <ul className="divide-y">
            {predicas.map((p) => {
              const img = miniatura(p);
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {img ? <img src={img} alt="" className="h-14 w-24 rounded-md object-cover" /> : <div className="bg-muted h-14 w-24 rounded-md" />}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-medium">
                      {p.destacada && <Star className="size-3.5 fill-amber-400 text-amber-400" />}
                      <span className="truncate">{p.titulo}</span>
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {p.predicador} · {fecha(p.fecha)} · {p.vistas} vistas
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <EstadoPublicacionBadge estado={p.estado} />
                      {p.serie && <Badge variant="violet">{p.serie}</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <FormDialog
                      title="Editar prédica"
                      action={guardarPredica.bind(null, p.id)}
                      successMessage="Prédica actualizada"
                      trigger={
                        <Button size="icon-sm" variant="outline" aria-label="Editar">
                          <Pencil />
                        </Button>
                      }
                    >
                      <PredicaFields p={p} series={series} />
                    </FormDialog>
                    <AccionesContenido tabla="predica" id={p.id} estado={p.estado} nombre={p.titulo} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
