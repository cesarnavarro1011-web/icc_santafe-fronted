import type { Actividad, Curso } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/workspace/ui-kit";
import { DIAS_LARGO, ORDEN_SEMANA } from "@/lib/horario";
import { opciones, TIPO_ACTIVIDAD } from "@/lib/labels";

export function CursoFields({ curso }: { curso?: Curso }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Código">
        {curso ? (
          <Input value={curso.codigo} readOnly disabled />
        ) : (
          <Input name="codigo" placeholder="Ej: TEOL-1 (vacío = automático)" />
        )}
      </Field>
      <Field label="Nombre *">
        <Input name="nombre" defaultValue={curso?.nombre} required />
      </Field>
      <Field label="Descripción" className="sm:col-span-2">
        <Textarea name="descripcion" rows={3} defaultValue={curso?.descripcion ?? ""} />
      </Field>
      <Field label="Nivel del programa">
        <Input name="nivel" type="number" min={1} defaultValue={curso?.nivel ?? ""} />
      </Field>
      <Field label="Duración (días)">
        <Input name="duracionDias" type="number" min={1} defaultValue={curso?.duracionDias ?? 90} />
      </Field>
      <Field label="Costo">
        <Input name="costo" type="number" min={0} step="any" defaultValue={curso ? Number(curso.costo) : 0} />
      </Field>
      <Field label="Estado">
        <NativeSelect name="estado" defaultValue={curso?.estado ?? "ACTIVO"}>
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </NativeSelect>
      </Field>
      <Field label="Horario de clases" className="sm:col-span-2">
        <div className="flex flex-wrap gap-2">
          {ORDEN_SEMANA.map((d) => (
            <label key={d} className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm capitalize">
              <input type="checkbox" name="dias" value={d} defaultChecked={curso?.diasClase.includes(d)} className="size-4 accent-violet-600" />
              {DIAS_LARGO[d]}
            </label>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <Input name="horaInicio" type="time" aria-label="Hora de inicio" defaultValue={curso?.horaInicio ?? ""} />
          <Input name="horaFin" type="time" aria-label="Hora de fin" defaultValue={curso?.horaFin ?? ""} />
        </div>
        <p className="text-muted-foreground text-xs">Con estos días se generan las fechas de la tabla de asistencia. El estudiante lo ve antes de inscribirse.</p>
      </Field>
      <Field label={curso?.imagenPath ? "Cambiar imagen de portada" : "Imagen de portada (opcional)"} className="sm:col-span-2">
        {curso?.imagenPath && (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/archivos/portada/${curso.id}?v=${curso.updatedAt.getTime()}`} alt="Portada actual" className="h-16 w-28 rounded-md border object-cover" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="quitarImagen" className="size-4 accent-red-600" /> Quitar imagen
            </label>
          </div>
        )}
        <Input name="imagen" type="file" accept="image/png,image/jpeg,image/webp" />
        <p className="text-muted-foreground text-xs">JPG, PNG o WebP, máx. 5 MB. Horizontal (ej. 1200×600). Sin imagen se usa el degradado.</p>
      </Field>
    </div>
  );
}

export function ActividadFields({ actividad }: { actividad?: Actividad }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nombre *" className="sm:col-span-2">
        <Input name="nombre" defaultValue={actividad?.nombre} required />
      </Field>
      <Field label="Tipo">
        <NativeSelect name="tipo" defaultValue={actividad?.tipo ?? "TAREA"}>
          {opciones(TIPO_ACTIVIDAD).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Nivel">
        <Input name="nivel" type="number" min={1} defaultValue={actividad?.nivel ?? 1} />
      </Field>
      <Field label="Nota máxima">
        <Input name="notaMax" type="number" min={1} step="any" defaultValue={actividad?.notaMax ?? 10} />
      </Field>
      <Field label="Peso en la nota final (%)">
        <Input name="peso" type="number" min={0} step="any" defaultValue={actividad?.peso ?? 100} />
      </Field>
      <Field label="Orden">
        <Input name="orden" type="number" defaultValue={actividad?.orden ?? 0} />
      </Field>
      <Field label="Link de material (opcional)">
        <Input name="linkMaterial" type="url" placeholder="https://..." defaultValue={actividad?.linkMaterial ?? ""} />
      </Field>
      <Field label={actividad?.materialPath ? "Reemplazar material (PDF/imagen)" : "Subir material (PDF/imagen)"} className="sm:col-span-2">
        <Input name="material" type="file" accept="application/pdf,image/png,image/jpeg" />
      </Field>
      <Field label="Instrucciones" className="sm:col-span-2">
        <Textarea name="instrucciones" rows={3} defaultValue={actividad?.instrucciones ?? ""} />
      </Field>
    </div>
  );
}
