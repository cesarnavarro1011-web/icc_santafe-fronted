import type {
  EstadoCertificado,
  EstadoOfrenda,
  EstadoCivil,
  EstadoEntrega,
  EstadoMatricula,
  EstadoPago,
  EstadoRegistro,
  MetodoPago,
  RolMaestro,
  TipoActividad,
  TipoBautismo,
  TipoOfrenda,
  TipoServicio,
} from "@prisma/client";
import type { BadgeVariant } from "@/components/ui/badge";

type Etiquetas<E extends string> = Record<E, { label: string; variant: BadgeVariant }>;

export const ESTADO_REGISTRO: Etiquetas<EstadoRegistro> = {
  ACTIVO: { label: "Activo", variant: "success" },
  INACTIVO: { label: "Inactivo", variant: "muted" },
};

export const ESTADO_CIVIL: Record<EstadoCivil, string> = {
  SOLTERO: "Soltero(a)",
  CASADO: "Casado(a)",
  DIVORCIADO: "Divorciado(a)",
  VIUDO: "Viudo(a)",
  UNION_LIBRE: "Unión libre",
};

export const TIPO_BAUTISMO: Etiquetas<TipoBautismo> = {
  AGUA: { label: "Agua", variant: "info" },
  ESPIRITU: { label: "Espíritu", variant: "violet" },
};

export const TIPO_SERVICIO: Etiquetas<TipoServicio> = {
  DOMINGO: { label: "Domingo", variant: "violet" },
  MIERCOLES: { label: "Miércoles", variant: "info" },
  GV: { label: "GV", variant: "success" },
  ESPECIAL: { label: "Especial", variant: "warning" },
  OTRO: { label: "Otro", variant: "muted" },
};

export const TIPO_ACTIVIDAD: Etiquetas<TipoActividad> = {
  TAREA: { label: "Tarea", variant: "warning" },
  EXAMEN: { label: "Examen", variant: "violet" },
  MATERIAL: { label: "Material", variant: "info" },
  CLASE: { label: "Clase", variant: "success" },
};

export const ESTADO_MATRICULA: Etiquetas<EstadoMatricula> = {
  EN_PROGRESO: { label: "En progreso", variant: "info" },
  APROBADO: { label: "Aprobado", variant: "success" },
  REPROBADO: { label: "Reprobado", variant: "danger" },
  VENCIDO: { label: "Vencido", variant: "danger" },
  RETIRADO: { label: "Retirado", variant: "muted" },
};

export const ESTADO_ENTREGA: Etiquetas<EstadoEntrega> = {
  ENVIADA: { label: "Enviada", variant: "info" },
  APROBADA: { label: "Aprobada", variant: "success" },
  REPROBADA: { label: "Reprobada", variant: "danger" },
  DEVUELTA: { label: "Devuelta", variant: "warning" },
};

export const ESTADO_PAGO: Etiquetas<EstadoPago> = {
  PENDIENTE: { label: "Pendiente", variant: "warning" },
  ABONO: { label: "Abono", variant: "info" },
  COMPLETADO: { label: "Completado", variant: "success" },
  EXENTO: { label: "Exento", variant: "violet" },
};

export const METODO_PAGO: Record<MetodoPago, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  NEQUI: "Nequi",
  DAVIPLATA: "Daviplata",
  EXENTO: "Exento",
};

export const ROL_MAESTRO: Record<RolMaestro, string> = { TITULAR: "Titular", AUXILIAR: "Auxiliar" };

export const ESTADO_CERTIFICADO: Etiquetas<EstadoCertificado> = {
  EN_FIRMA: { label: "En firma", variant: "warning" },
  EMITIDO: { label: "Emitido", variant: "success" },
  ANULADO: { label: "Anulado", variant: "muted" },
};

export const TIPO_OFRENDA: Etiquetas<TipoOfrenda> = {
  DIEZMO: { label: "Diezmo", variant: "violet" },
  OFRENDA: { label: "Ofrenda", variant: "info" },
  PRIMICIA: { label: "Primicia", variant: "success" },
  PRO_TEMPLO: { label: "Pro-templo", variant: "warning" },
  MISIONES: { label: "Misiones", variant: "info" },
  ACCION_GRACIAS: { label: "Acción de gracias", variant: "success" },
  OTRO: { label: "Otro", variant: "muted" },
};

export const ESTADO_OFRENDA: Etiquetas<EstadoOfrenda> = {
  PENDIENTE: { label: "Por verificar", variant: "warning" },
  VERIFICADO: { label: "Verificado", variant: "success" },
  OBSERVADO: { label: "Con observación", variant: "danger" },
};

export function opciones<E extends string>(mapa: Record<E, string | { label: string }>) {
  return (Object.keys(mapa) as E[]).map((value) => {
    const v = mapa[value];
    return { value, label: typeof v === "string" ? v : v.label };
  });
}

// ── Formato ──────────────────────────────────────────────────
const TZ = "America/Bogota";

export function fecha(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CO", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });
}

export function fechaHora(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-CO", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" });
}

export function dinero(v: number | string | { toString(): string } | null | undefined) {
  return Number(v ?? 0).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

export function edad(nacimiento: Date | null | undefined) {
  if (!nacimiento) return "—";
  const hoy = new Date();
  let anios = hoy.getFullYear() - nacimiento.getUTCFullYear();
  let meses = hoy.getMonth() - nacimiento.getUTCMonth();
  if (meses < 0) {
    anios--;
    meses += 12;
  }
  return `${anios} años${meses ? ` y ${meses} meses` : ""}`;
}

/** Fecha "yyyy-mm-dd" para inputs type=date */
export function isoDate(d: Date | null | undefined) {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}
