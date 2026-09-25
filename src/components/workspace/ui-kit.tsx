import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const KPI_COLORS = {
  violet: { chip: "bg-violet-50 text-violet-600 ring-violet-100", barra: "bg-violet-500", trazo: "stroke-violet-500", brillo: "from-violet-500/10" },
  blue: { chip: "bg-blue-50 text-blue-600 ring-blue-100", barra: "bg-blue-500", trazo: "stroke-blue-500", brillo: "from-blue-500/10" },
  green: { chip: "bg-emerald-50 text-emerald-600 ring-emerald-100", barra: "bg-emerald-500", trazo: "stroke-emerald-500", brillo: "from-emerald-500/10" },
  amber: { chip: "bg-amber-50 text-amber-600 ring-amber-100", barra: "bg-amber-500", trazo: "stroke-amber-500", brillo: "from-amber-500/10" },
  red: { chip: "bg-red-50 text-red-600 ring-red-100", barra: "bg-red-500", trazo: "stroke-red-500", brillo: "from-red-500/10" },
  teal: { chip: "bg-teal-50 text-teal-600 ring-teal-100", barra: "bg-teal-500", trazo: "stroke-teal-500", brillo: "from-teal-500/10" },
  indigo: { chip: "bg-indigo-50 text-indigo-600 ring-indigo-100", barra: "bg-indigo-500", trazo: "stroke-indigo-500", brillo: "from-indigo-500/10" },
  pink: { chip: "bg-pink-50 text-pink-600 ring-pink-100", barra: "bg-pink-500", trazo: "stroke-pink-500", brillo: "from-pink-500/10" },
  slate: { chip: "bg-slate-100 text-slate-600 ring-slate-200", barra: "bg-slate-500", trazo: "stroke-slate-500", brillo: "from-slate-500/10" },
} as const;

/** Anillo de progreso (SVG) con el valor en el centro. */
function Anillo({ pct, trazo, children }: { pct: number; trazo: string; children: ReactNode }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-16 shrink-0">
      <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-muted" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          className={cn(trazo, "transition-all")}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(100, pct)) / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums">{children}</div>
    </div>
  );
}

/**
 * Indicador de tablero. Opcional:
 *  - `progreso` (0–100): barra fina bajo el valor
 *  - `anillo` (0–100): el valor se muestra dentro de un anillo de progreso
 */
export function KpiCard({
  icon: Icon,
  label,
  value,
  color = "blue",
  sub,
  progreso,
  anillo,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  color?: keyof typeof KPI_COLORS;
  sub?: string;
  progreso?: number;
  anillo?: number;
}) {
  const c = KPI_COLORS[color];
  return (
    <div className="bg-card relative overflow-hidden rounded-2xl border p-5 shadow-sm transition hover:shadow-md">
      <div className={cn("pointer-events-none absolute -top-12 -right-12 size-36 rounded-full bg-gradient-to-br to-transparent", c.brillo)} />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl ring-1", c.chip)}>
          <Icon className="size-5" />
        </span>
      </div>
      {anillo !== undefined ? (
        <div className="relative mt-2 flex items-center gap-3">
          <Anillo pct={anillo} trazo={c.trazo}>
            {value}
          </Anillo>
          {sub && <p className="text-muted-foreground text-xs leading-snug">{sub}</p>}
        </div>
      ) : (
        <div className="relative">
          <div className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
          {sub && <p className="text-muted-foreground mt-1 text-xs">{sub}</p>}
          {progreso !== undefined && (
            <div className="bg-muted mt-3 h-1.5 overflow-hidden rounded-full">
              <div className={cn("h-full rounded-full transition-all", c.barra)} style={{ width: `${Math.max(0, Math.min(100, progreso))}%` }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Panel({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("bg-card rounded-xl border shadow-sm", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function EmptyState({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-12 text-center text-sm">
      <Icon className="size-10 opacity-30" />
      <div>{children}</div>
    </div>
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label className="text-muted-foreground text-xs font-semibold uppercase">{label}</Label>
      {children}
    </div>
  );
}

export function EstadoBadge<E extends string>({ valor, mapa }: { valor: E; mapa: Record<E, { label: string; variant: BadgeVariant }> }) {
  const m = mapa[valor];
  return <Badge variant={m?.variant ?? "muted"}>{m?.label ?? valor}</Badge>;
}

export function Nota({ valor, min = 6 }: { valor: number | null | undefined; min?: number }) {
  if (valor === null || valor === undefined) return <span className="text-muted-foreground">—</span>;
  return <span className={cn("font-bold", valor >= min ? "text-emerald-600" : "text-red-500")}>{valor.toFixed(1)}</span>;
}
