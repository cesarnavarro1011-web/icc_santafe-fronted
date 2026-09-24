import { NativeSelect } from "@/components/ui/native-select";

type Props = {
  name: string;
  opciones: { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
};

export function OpcionSelect({ name, opciones, placeholder = "Selecciona...", defaultValue, required }: Props) {
  return (
    <NativeSelect name={name} defaultValue={defaultValue ?? ""} required={required}>
      <option value="" disabled={required}>
        {placeholder}
      </option>
      {opciones.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </NativeSelect>
  );
}
