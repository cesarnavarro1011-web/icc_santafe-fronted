import type { WebEvento } from "@prisma/client";
import { CalendarDays, Copy, Pencil, Plus, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ActionButton } from "@/components/workspace/action-button";
import { FormDialog } from "@/components/workspace/form-dialog";
import { EmptyState, Field, PageHeader } from "@/components/workspace/ui-kit";
import { CATEGORIAS_EVENTO } from "@/components/sections/categorias-evento";
import { hora12 } from "@/lib/horario";
import { fecha, isoDate } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { cn } from "@/lib/utils";
import { urlImagen } from "@/server/contenido";
import { duplicarEvento, guardarEvento } from "../actions";
import { AccionesContenido, EstadoPublicacionBadge, ImagenField, PublicacionFields } from "../campos";

function EventoFields({ e }: { e?: WebEvento }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Título *" className="sm:col-span-2">
        <Input name="titulo" defaultValue={e?.titulo} maxLength={120} required />
      </Field>
      <Field label="Descripción *" className="sm:col-span-2">
        <Textarea name="descripcion" rows={3} defaultValue={e?.descripcion} required />
      </Field>
      <Field label="Fecha *">
        <Input name="fecha" type="date" defaultValue={isoDate(e?.fecha)} required />
      </Field>
      <Field label="Hora *">
        <Input name="hora" type="time" defaultValue={e?.hora ?? "19:00"} required />
      </Field>
      <Field label="Lugar *">
        <Input name="lugar" defaultValue={e?.lugar ?? "Santuario principal"} required />
      </Field>
      <Field label="Categoría">
        <NativeSelect name="categoria" defaultValue={e?.categoria ?? "evento-especial"}>
          {Object.entries(CATEGORIAS_EVENTO).map(([k, v]) => (
            <option key={k} value={k}>
              {v.nombre}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className="flex flex-wrap gap-4 sm:col-span-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="recurrente" defaultChecked={e?.recurrente} className="size-4 accent-violet-600" /> Se repite (siempre visible)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="destacado" defaultChecked={e?.destacado} className="size-4 accent-violet-600" /> Destacado (aparece primero)
        </label>
      </div>
      <ImagenField actual={e ? urlImagen(e) : null} />
      <PublicacionFields estado={e?.estado} programable={false} />
    </div>
  );
}

export default async function EventosContenidoPage() {
  await requirePage(R.CONTENIDO);
  const hoy = new Date();
  hoy.setUTCHours(0, 0, 0, 0);
  const eventos = await prisma.webEvento.findMany({ orderBy: { fecha: "desc" } });
  const proximos = eventos.filter((e) => e.fecha >= hoy || e.recurrente).reverse();
  const pasados = eventos.filter((e) => e.fecha < hoy && !e.recurrente);

  const Tarjeta = ({ e, pasado }: { e: WebEvento; pasado?: boolean }) => {
    const img = urlImagen(e);
    const cat = CATEGORIAS_EVENTO[e.categoria as keyof typeof CATEGORIAS_EVENTO];
    return (
      <article className={cn("bg-card flex gap-3 overflow-hidden rounded-xl border p-3 shadow-sm", pasado && "opacity-60")}>
        <div
          className="flex size-20 shrink-0 flex-col items-center justify-center rounded-lg bg-gradient-to-br from-[#5a189a] to-[#0E34A0] bg-cover bg-center text-white"
          style={img ? { backgroundImage: `linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,.45)), url("${img}")` } : undefined}
        >
          <span className="text-2xl leading-none font-bold">{e.fecha.getUTCDate()}</span>
          <span className="text-[10px] uppercase">{e.fecha.toLocaleDateString("es-CO", { month: "short", timeZone: "UTC" })}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {e.destacado && <Star className="size-3.5 fill-amber-400 text-amber-400" />}
            <h3 className="truncate font-semibold">{e.titulo}</h3>
          </div>
          <p className="text-muted-foreground text-xs">
            {fecha(e.fecha)} · {hora12(e.hora)} · {e.lugar}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <EstadoPublicacionBadge estado={e.estado} />
            {cat && <Badge variant="violet">{cat.nombre}</Badge>}
            {e.recurrente && <Badge variant="info">Se repite</Badge>}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <FormDialog
            title="Editar evento"
            action={guardarEvento.bind(null, e.id)}
            successMessage="Evento actualizado"
            trigger={
              <Button size="icon-sm" variant="outline" aria-label="Editar">
                <Pencil />
              </Button>
            }
          >
            <EventoFields e={e} />
          </FormDialog>
          <ActionButton size="icon-sm" variant="ghost" aria-label="Duplicar" title="Duplicar una semana después" successMessage="Copia creada como borrador" action={duplicarEvento.bind(null, e.id)}>
            <Copy />
          </ActionButton>
          <AccionesContenido tabla="evento" id={e.id} estado={e.estado} nombre={e.titulo} />
        </div>
      </article>
    );
  };

  return (
    <>
      <PageHeader
        title="Eventos"
        description="Los visitantes ven los próximos eventos, filtran por categoría y pueden agregarlos a su calendario."
        actions={
          <FormDialog
            title="Nuevo evento"
            action={guardarEvento.bind(null, null)}
            successMessage="Evento guardado"
            trigger={
              <Button>
                <Plus /> Nuevo evento
              </Button>
            }
          >
            <EventoFields />
          </FormDialog>
        }
      />
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Próximos ({proximos.length})</h2>
      {proximos.length === 0 ? (
        <EmptyState icon={CalendarDays}>No hay eventos próximos. ¡Agrega el siguiente!</EmptyState>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {proximos.map((e) => (
            <Tarjeta key={e.id} e={e} />
          ))}
        </div>
      )}
      {pasados.length > 0 && (
        <>
          <h2 className="text-muted-foreground mt-2 text-xs font-semibold tracking-wider uppercase">Pasados ({pasados.length}) · ya no se muestran</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {pasados.slice(0, 20).map((e) => (
              <Tarjeta key={e.id} e={e} pasado />
            ))}
          </div>
        </>
      )}
    </>
  );
}
