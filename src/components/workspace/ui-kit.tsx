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
  violet: "from-violet-500 to-violet-700",
  blue: "from-blue-500 to-blue-700",
  green: "from-emerald-500 to-emerald-700",
  amber: "from-amber-400 to-amber-600",
  red: "from-red-500 to-red-700",
  teal: "from-teal-500 to-teal-700",
  indigo: "from-indigo-500 to-indigo-700",
  pink: "from-pink-500 to-pink-700",
  slate: "from-slate-500 to-slate-700",
} as const;

export function KpiCard({
  icon: Icon,
  label,
  value,
  color = "blue",
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  color?: keyof typeof KPI_COLORS;
  sub?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow", KPI_COLORS[color])}>
      <Icon className="mb-1 size-6" />
      <div className="text-3xl leading-none font-bold">{value}</div>
      <div className="mt-1 text-sm font-medium opacity-85">{label}</div>
      {sub && <div className="mt-0.5 text-xs opacity-60">{sub}</div>}
      <Icon className="absolute -right-3 -bottom-3 size-20 opacity-10" />
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
