import type { Fiel } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Field } from "@/components/workspace/ui-kit";
import { ESTADO_CIVIL, isoDate, opciones } from "@/lib/labels";

/** Campos del formulario de fiel (se usan dentro de un FormDialog). */
export function FielFields({ fiel }: { fiel?: Fiel }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fiel ? (
        <Field label="ID de fiel">
          <Input value={fiel.codigo} readOnly disabled />
        </Field>
      ) : (
        <Field label="Documento (opcional)">
          <Input name="documento" placeholder="Genera el ID F-<documento>" inputMode="numeric" />
        </Field>
      )}
      <Field label="Nombre *">
        <Input name="nombre" defaultValue={fiel?.nombre} required />
      </Field>
      <Field label="Apellido *">
        <Input name="apellido" defaultValue={fiel?.apellido} required />
      </Field>
      <Field label="Fecha de nacimiento">
        <Input name="fechaNacimiento" type="date" defaultValue={isoDate(fiel?.fechaNacimiento)} />
      </Field>
      <Field label="Estado civil">
        <NativeSelect name="estadoCivil" defaultValue={fiel?.estadoCivil ?? ""}>
          <option value="">—</option>
          {opciones(ESTADO_CIVIL).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Bautizado">
        <NativeSelect name="bautizado" defaultValue={fiel?.bautizado ? "true" : "false"}>
          <option value="false">No</option>
          <option value="true">Sí</option>
        </NativeSelect>
      </Field>
      <Field label="Celular">
        <Input name="celular" type="tel" defaultValue={fiel?.celular ?? ""} />
      </Field>
      <Field label="Correo">
        <Input name="correo" type="email" defaultValue={fiel?.correo ?? ""} />
      </Field>
      <Field label="Dirección" className="sm:col-span-2">
        <Input name="direccion" defaultValue={fiel?.direccion ?? ""} />
      </Field>
      <Field label="Estado">
        <NativeSelect name="estado" defaultValue={fiel?.estado ?? "ACTIVO"}>
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </NativeSelect>
      </Field>
    </div>
  );
}
