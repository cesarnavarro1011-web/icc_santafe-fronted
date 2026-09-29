import type { EstadoPeticion, Prisma } from "@prisma/client";
import { Archive, CheckCheck, HandHeart, Heart, StickyNote } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ActionButton } from "@/components/workspace/action-button";
import { FormDialog } from "@/components/workspace/form-dialog";
import { SearchBar } from "@/components/workspace/search-bar";
import { EmptyState, Field, KpiCard, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { fechaHora } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { actualizarPeticion } from "../actions";

const ESTADO: Record<EstadoPeticion, { label: string; variant: BadgeVariant }> = {
  NUEVA: { label: "Nueva", variant: "warning" },
  EN_ORACION: { label: "Orando", variant: "violet" },
  RESPONDIDA: { label: "Respondida", variant: "success" },
  ARCHIVADA: { label: "Archivada", variant: "muted" },
};

export default async function PeticionesPage({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  await requirePage(R.CONTENIDO);
  const { q, estado } = await searchParams;
  const where: Prisma.PeticionOracionWhereInput = {
    estado: estado ? (estado as EstadoPeticion) : { not: "ARCHIVADA" },
    ...(q ? { OR: [{ mensaje: { contains: q, mode: "insensitive" } }, { nombre: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [peticiones, conteo] = await Promise.all([
    prisma.peticionOracion.findMany({ where, orderBy: [{ estado: "asc" }, { createdAt: "desc" }], take: 200 }),
    prisma.peticionOracion.groupBy({ by: ["estado"], _count: true }),
  ]);
  const n = (e: EstadoPeticion) => conteo.find((c) => c.estado === e)?._count ?? 0;

  return (
    <>
      <PageHeader title="Peticiones de oración" description="Lo que envían los visitantes desde el formulario de la página." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={HandHeart} label="Nuevas" value={n("NUEVA")} color={n("NUEVA") ? "amber" : "slate"} />
        <KpiCard icon={Heart} label="En oración" value={n("EN_ORACION")} color="violet" />
        <KpiCard icon={CheckCheck} label="Respondidas" value={n("RESPONDIDA")} color="green" sub="testimonios de oración contestada" />
        <KpiCard icon={Archive} label="Archivadas" value={n("ARCHIVADA")} color="slate" />
      </div>
      <SearchBar
        placeholder="Buscar en las peticiones..."
        filtros={[{ name: "estado", label: "Activas (sin archivadas)", options: Object.entries(ESTADO).map(([value, v]) => ({ value, label: v.label })) }]}
      />
      <Panel>
        {peticiones.length === 0 ? (
          <EmptyState icon={HandHeart}>No hay peticiones con este filtro.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {peticiones.map((p) => (
              <li key={p.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={ESTADO[p.estado].variant}>{ESTADO[p.estado].label}</Badge>
                    <span className="font-semibold">{p.nombre}</span>
                    {p.contacto && <span className="text-muted-foreground text-xs">· {p.contacto}</span>}
                  </div>
                  <span className="text-muted-foreground text-xs">{fechaHora(p.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm whitespace-pre-line">{p.mensaje}</p>
                {p.nota && (
                  <p className="mt-2 flex gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <StickyNote className="size-3.5 shrink-0" /> {p.nota}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.estado !== "EN_ORACION" && (
                    <ActionButton size="sm" variant="outline" successMessage="Marcada: orando por esta petición" action={actualizarPeticion.bind(null, p.id, "EN_ORACION", undefined)}>
                      <Heart /> Orando
                    </ActionButton>
                  )}
                  {p.estado !== "RESPONDIDA" && (
                    <ActionButton size="sm" variant="outline" successMessage="¡Gloria a Dios! Marcada como respondida" action={actualizarPeticion.bind(null, p.id, "RESPONDIDA", undefined)}>
                      <CheckCheck /> Respondida
                    </ActionButton>
                  )}
                  <FormDialog
                    title="Nota interna"
                    description="Solo la ve el equipo, no el visitante."
                    action={actualizarPeticion.bind(null, p.id, p.estado)}
                    successMessage="Nota guardada"
                    trigger={
                      <Button size="sm" variant="ghost">
                        <StickyNote /> Nota
                      </Button>
                    }
                  >
                    <Field label="Nota">
                      <Textarea name="nota" rows={3} defaultValue={p.nota ?? ""} placeholder="Ej: la llamamos el martes; pidió visita" />
                    </Field>
                  </FormDialog>
                  {p.estado !== "ARCHIVADA" && (
                    <ActionButton size="sm" variant="ghost" successMessage="Archivada" action={actualizarPeticion.bind(null, p.id, "ARCHIVADA", undefined)}>
                      <Archive /> Archivar
                    </ActionButton>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
