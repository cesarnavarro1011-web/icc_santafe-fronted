"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/workspace/ui-kit";

type Opcion = { value: string; label: string };

export type OpcionesDestino = { rol: Opcion[]; grupo: Opcion[]; curso: Opcion[]; cargo: Opcion[] };

export type DatosComunicado = {
  asunto: string;
  cuerpo: string;
  enlaceUrl: string | null;
  enlaceTexto: string | null;
  porCorreo: boolean;
  porWhatsapp: boolean;
  tipo: string;
  valor: string | null;
  imagenes: { ruta: string; url: string }[];
};

const TIPOS = [
  { value: "todos", label: "Todos los fieles activos" },
  { value: "rol", label: "Por rol (usuarios del sistema)" },
  { value: "grupo", label: "Por grupo / líder" },
  { value: "curso", label: "Estudiantes de un curso" },
  { value: "cargo", label: "Por cargo o ministerio" },
];

/** Campos del comunicado (van dentro de un FormDialog). */
export function ComunicadoFields({ c, opciones }: { c?: DatosComunicado; opciones: OpcionesDestino }) {
  const [tipo, setTipo] = useState(c?.tipo ?? "todos");
  const lista = tipo === "todos" ? [] : opciones[tipo as keyof OpcionesDestino];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Asunto *" className="sm:col-span-2">
        <Input name="asunto" defaultValue={c?.asunto} maxLength={150} required placeholder="Ej: Vigilia de oración este viernes" />
      </Field>
      <Field label="Mensaje *" className="sm:col-span-2">
        <Textarea name="cuerpo" rows={8} defaultValue={c?.cuerpo} required maxLength={5000} placeholder={"Hola {{nombre}},\n\nTe invitamos a…"} />
        <p className="text-muted-foreground text-xs">
          Escribe <code>{"{{nombre}}"}</code> para saludar a cada persona por su nombre, <code>**texto**</code> para negrita y deja una línea en
          blanco entre párrafos. Los enlaces (https://…) se vuelven clic.
        </p>
      </Field>

      <Field label="Enviar a *">
        <NativeSelect name="tipoDestino" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      {tipo !== "todos" ? (
        <Field label="¿Cuál?">
          <NativeSelect key={tipo} name="valorDestino" defaultValue={c?.tipo === tipo ? (c.valor ?? "") : ""} required>
            <option value="" disabled>
              {lista.length ? "Selecciona…" : "No hay opciones"}
            </option>
            {lista.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      ) : (
        <div />
      )}

      <fieldset className="grid gap-2 sm:col-span-2">
        <legend className="text-muted-foreground mb-1 text-xs font-semibold uppercase">Canales *</legend>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="porCorreo" defaultChecked={c?.porCorreo ?? true} className="size-4 accent-violet-600" /> Correo
            (con imágenes y botón)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="porWhatsapp" defaultChecked={c?.porWhatsapp ?? false} className="size-4 accent-violet-600" /> WhatsApp
            (solo texto)
          </label>
        </div>
      </fieldset>

      <Field label="Botón (opcional): texto">
        <Input name="enlaceTexto" defaultValue={c?.enlaceTexto ?? ""} placeholder="Ej: Ver evento" />
      </Field>
      <Field label="Botón: enlace">
        <Input name="enlaceUrl" defaultValue={c?.enlaceUrl ?? ""} placeholder="https://… o /eventos" />
      </Field>

      <Field label="Imágenes (máx. 4, se muestran en el correo)" className="sm:col-span-2">
        {c && c.imagenes.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {c.imagenes.map((img) => (
              <label key={img.ruta} className="flex flex-col items-center gap-1 text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-16 w-24 rounded-md border object-cover" />
                <span className="flex items-center gap-1">
                  <input type="checkbox" name="quitarImagen" value={img.ruta} className="size-3.5 accent-red-600" /> Quitar
                </span>
              </label>
            ))}
          </div>
        )}
        <Input name="imagenes" type="file" accept="image/png,image/jpeg,image/webp" multiple />
        <p className="text-muted-foreground text-xs">JPG, PNG o WebP, máx. 3 MB cada una. Van dentro del correo, arriba del mensaje.</p>
      </Field>
    </div>
  );
}
