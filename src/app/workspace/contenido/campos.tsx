import type { EstadoPublicacion } from "@prisma/client";
import { ArrowDown, ArrowUp, Eye, EyeOff, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { ActionButton } from "@/components/workspace/action-button";
import { Field } from "@/components/workspace/ui-kit";
import { cambiarPublicacion, eliminarContenido, mover } from "./actions";

type Tabla = "slide" | "anuncio" | "evento" | "predica" | "ministerio" | "historia" | "persona";
const ORDENABLES = ["slide", "ministerio", "historia", "persona"] as const;
const esOrdenable = (t: Tabla): t is (typeof ORDENABLES)[number] => (ORDENABLES as readonly string[]).includes(t);

/** "yyyy-mm-ddThh:mm" en hora local para inputs datetime-local */
export function fechaHoraLocal(d: Date | null | undefined) {
  if (!d) return "";
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return x.toISOString().slice(0, 16);
}

export function ImagenField({ actual, etiqueta = "Imagen", ayuda }: { actual: string | null; etiqueta?: string; ayuda?: string }) {
  return (
    <Field label={actual ? `Cambiar ${etiqueta.toLowerCase()}` : etiqueta} className="sm:col-span-2">
      {actual && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={actual} alt="Imagen actual" className="h-16 w-28 rounded-md border object-cover" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="quitarImagen" className="size-4 accent-red-600" /> Quitar imagen
          </label>
        </div>
      )}
      <Input name="imagen" type="file" accept="image/png,image/jpeg,image/webp" />
      <p className="text-muted-foreground text-xs">{ayuda ?? "JPG, PNG o WebP, máx. 5 MB."}</p>
    </Field>
  );
}

/** Estado (borrador/publicado) y, opcionalmente, ventana de publicación programada. */
export function PublicacionFields({
  estado,
  desde,
  hasta,
  programable = true,
}: {
  estado?: EstadoPublicacion;
  desde?: Date | null;
  hasta?: Date | null;
  programable?: boolean;
}) {
  return (
    <div className="bg-muted/40 grid gap-4 rounded-lg border p-3 sm:col-span-2 sm:grid-cols-3">
      <Field label="Estado">
        <NativeSelect name="estado" defaultValue={estado ?? "PUBLICADO"}>
          <option value="PUBLICADO">Publicado</option>
          <option value="BORRADOR">Borrador (no se ve)</option>
        </NativeSelect>
      </Field>
      {programable && (
        <>
          <Field label="Mostrar desde (opcional)">
            <Input name="publicarDesde" type="datetime-local" defaultValue={fechaHoraLocal(desde)} />
          </Field>
          <Field label="Mostrar hasta (opcional)">
            <Input name="publicarHasta" type="datetime-local" defaultValue={fechaHoraLocal(hasta)} />
          </Field>
        </>
      )}
    </div>
  );
}

/** Etiqueta de estado considerando la programación: Publicado, Programado, Vencido o Borrador. */
export function EstadoPublicacionBadge({ estado, desde, hasta }: { estado: EstadoPublicacion; desde?: Date | null; hasta?: Date | null }) {
  const ahora = new Date();
  if (estado === "BORRADOR") return <Badge variant="muted">Borrador</Badge>;
  if (desde && desde > ahora) return <Badge variant="info">Programado</Badge>;
  if (hasta && hasta < ahora) return <Badge variant="warning">Vencido</Badge>;
  return <Badge variant="success">Publicado</Badge>;
}

/** Botones de publicar/ocultar, subir/bajar y eliminar de una fila. */
export function AccionesContenido({
  tabla,
  id,
  estado,
  nombre,
  ordenable,
}: {
  tabla: Tabla;
  id: string;
  estado: EstadoPublicacion;
  nombre: string;
  ordenable?: boolean;
}) {
  const publicado = estado === "PUBLICADO";
  return (
    <>
      {ordenable && esOrdenable(tabla) && (
        <>
          <ActionButton size="icon-sm" variant="ghost" aria-label="Subir" title="Subir" successMessage="Orden actualizado" action={mover.bind(null, tabla, id, -1)}>
            <ArrowUp />
          </ActionButton>
          <ActionButton size="icon-sm" variant="ghost" aria-label="Bajar" title="Bajar" successMessage="Orden actualizado" action={mover.bind(null, tabla, id, 1)}>
            <ArrowDown />
          </ActionButton>
        </>
      )}
      <ActionButton
        size="icon-sm"
        variant="outline"
        aria-label={publicado ? "Ocultar" : "Publicar"}
        title={publicado ? "Ocultar de la página" : "Publicar en la página"}
        successMessage={publicado ? "Ya no se muestra en la página" : "¡Publicado en la página!"}
        action={cambiarPublicacion.bind(null, tabla, id, publicado ? "BORRADOR" : "PUBLICADO")}
      >
        {publicado ? <EyeOff /> : <Eye className="text-emerald-600" />}
      </ActionButton>
      <ActionButton
        size="icon-sm"
        variant="ghost"
        aria-label="Eliminar"
        title="Eliminar"
        confirm={`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`}
        successMessage="Eliminado"
        action={eliminarContenido.bind(null, tabla, id)}
      >
        <Trash2 className="text-red-600" />
      </ActionButton>
    </>
  );
}
