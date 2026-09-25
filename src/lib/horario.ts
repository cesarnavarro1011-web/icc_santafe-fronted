// Horario de clases de un curso (días de la semana + hora)

export const DIAS_LARGO = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0]; // lunes primero

export type Horario = { diasClase: number[]; horaInicio: string | null; horaFin: string | null };

export function hora12(h: string | null) {
  if (!h) return "";
  const [hh, mm] = h.split(":").map(Number);
  return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${hh < 12 ? "a. m." : "p. m."}`;
}

/** "Miércoles y viernes · 6:00 p. m. – 8:00 p. m." o null si no tiene horario. */
export function describirHorario(c: Horario) {
  if (c.diasClase.length === 0) return null;
  const dias = ORDEN_SEMANA.filter((d) => c.diasClase.includes(d)).map((d) => DIAS_LARGO[d]);
  const texto = dias.length > 1 ? `${dias.slice(0, -1).join(", ")} y ${dias.at(-1)}` : dias[0];
  const horas = c.horaInicio ? ` · ${hora12(c.horaInicio)}${c.horaFin ? ` – ${hora12(c.horaFin)}` : ""}` : "";
  return texto.charAt(0).toUpperCase() + texto.slice(1) + horas;
}
