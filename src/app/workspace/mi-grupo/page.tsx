import Link from "next/link";
import { CalendarRange, ClipboardCheck , UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { fecha } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { ROL_LABEL } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { domingoDe, hoyISO, lunesDe } from "@/server/turnos";

export default async function MiGrupoPage() {
  const user = await requirePage(["LIDER"]);
  const lunes = lunesDe(hoyISO());
  const grupos = await prisma.grupo.findMany({
    where: { liderId: user.fielId },
    orderBy: { nombre: "asc" },
    include: {
      miembros: { include: { usuario: { select: { rol: true } } }, orderBy: [{ apellido: "asc" }, { nombre: "asc" }] },
      turnos: { where: { semana: { gte: lunes } }, orderBy: { semana: "asc" }, take: 6 },
    },
  });

  if (grupos.length === 0) {
    return (
      <>
        <PageHeader title="Mi grupo" />
        <Panel>
          <EmptyState icon={UsersRound}>Aún no tienes un grupo asignado. El pastor lo asigna en “Grupos y líderes”.</EmptyState>
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Mi grupo"
        description="Tus fieles y los turnos en que tu grupo registra la asistencia de la iglesia"
      />
      {grupos.map((g) => {
        const turnoActual = g.turnos.find((t) => t.semana.getTime() === lunes.getTime());
        return (
          <div key={g.id} className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-3">
              <Panel title={g.nombre} className="lg:col-span-2">
                <p className="text-muted-foreground text-sm">
                  {g.miembros.length} miembros
                </p>
                {g.descripcion && <p className="text-muted-foreground mt-1 text-xs">{g.descripcion}</p>}
              </Panel>
              <Panel title={<span className="flex items-center gap-2"><CalendarRange className="size-4 text-violet-500" /> Próximos turnos</span>}>
                {turnoActual && (
                  <div className="mb-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                    <p className="font-semibold">¡Esta semana te toca!</p>
                    <Button size="sm" className="mt-2" asChild>
                      <Link href="/workspace/asistencia">
                        <ClipboardCheck /> Registrar asistencia
                      </Link>
                    </Button>
                  </div>
                )}
                {g.turnos.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Sin turnos programados.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {g.turnos.map((t) => (
                      <li key={t.id}>
                        {fecha(t.semana)} – {fecha(domingoDe(t.semana))}
                        {t.notas && <span className="text-muted-foreground"> · {t.notas}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
            <Panel title="Miembros">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fiel</TableHead>
                    <TableHead>Celular</TableHead>
                    <TableHead>Acceso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {g.miembros.map((m) => {
                    const rol = m.usuario?.rol;
                    const esLider = m.id === user.fielId;
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">
                          {m.nombre} {m.apellido}
                          {esLider && <span className="text-violet-600"> · tú</span>}
                        </TableCell>
                        <TableCell className="text-xs">{m.celular ?? "—"}</TableCell>
                        <TableCell>
                          {rol ? <Badge variant="muted">{ROL_LABEL[rol]}</Badge> : <span className="text-muted-foreground text-xs">Sin acceso</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Panel>
          </div>
        );
      })}
    </>
  );
}
