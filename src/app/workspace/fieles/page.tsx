import type { EstadoRegistro, Prisma } from "@prisma/client";
import { Ban, Pencil, Plus, RotateCcw, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionButton } from "@/components/workspace/action-button";
import { FormDialog } from "@/components/workspace/form-dialog";
import { SearchBar } from "@/components/workspace/search-bar";
import { EmptyState, EstadoBadge, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { edad, ESTADO_REGISTRO } from "@/lib/labels";
import { GestionCargos } from "./gestion-cargos";
import { prisma } from "@/lib/prisma";
import { R, tieneRol } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { cambiarEstadoFiel, guardarFiel } from "./actions";
import { FielFields } from "./fiel-form";

export default async function FielesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; cargo?: string; lider?: string }>;
}) {
  const user = await requirePage(R.PASTORAL);
  const { q, estado, cargo, lider } = await searchParams;
  const esAdmin = tieneRol(user.rol, R.ADMIN);

  const where: Prisma.FielWhereInput = {
    ...(estado ? { estado: estado as EstadoRegistro } : {}),
    ...(cargo ? { areas: { some: { areaId: cargo } } } : {}),
    ...(lider === "ninguno" ? { grupoId: null } : lider ? { grupoId: lider } : {}),
    ...(q
      ? {
          OR: ["codigo", "nombre", "apellido", "correo", "celular"].map((campo) => ({
            [campo]: { contains: q, mode: "insensitive" },
          })),
        }
      : {}),
  };
  const [fieles, total, grupos, areas] = await Promise.all([
    prisma.fiel.findMany({
      where,
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
      take: 300,
      include: {
        usuario: { select: { rol: true } },
        grupo: { include: { lider: { select: { nombre: true, apellido: true } } } },
        areas: { include: { area: true }, orderBy: { area: { nombre: "asc" } } },
      },
    }),
    prisma.fiel.count(),
    prisma.grupo.findMany({ where: { estado: "ACTIVO" }, orderBy: { nombre: "asc" }, include: { lider: true } }),
    prisma.area.findMany({ where: { estado: "ACTIVO" }, orderBy: { nombre: "asc" }, include: { _count: { select: { miembros: true } } } }),
  ]);
  const lideres = grupos.map((g) => ({
    value: g.id,
    label: g.lider ? `${g.lider.nombre} ${g.lider.apellido} (${g.nombre})` : `${g.nombre} (sin líder)`,
  }));
  const cargos = areas.map((a) => ({ value: a.id, label: a.nombre }));

  return (
    <>
      <PageHeader
        title="Gestión de fieles"
        description={`${total} registros`}
        actions={
          <>
          {esAdmin && <GestionCargos areas={areas.map((a) => ({ id: a.id, nombre: a.nombre, total: a._count.miembros }))} />}
          <FormDialog
            title="Nuevo fiel"
            action={guardarFiel.bind(null, null)}
            successMessage="Fiel registrado"
            trigger={
              <Button>
                <Plus /> Nuevo fiel
              </Button>
            }
          >
            <FielFields lideres={lideres} cargos={cargos} />
          </FormDialog>
          </>
        }
      />
      <SearchBar
        placeholder="Buscar por nombre, ID, correo o celular..."
        filtros={[
          { name: "cargo", label: "Todos los cargos", options: cargos },
          { name: "lider", label: "Todos los líderes", options: [{ value: "ninguno", label: "Sin líder" }, ...lideres] },
          { name: "estado", label: "Todos los estados", options: [{ value: "ACTIVO", label: "Activo" }, { value: "INACTIVO", label: "Inactivo" }] },
        ]}
      />
      <Panel>
        {fieles.length === 0 ? (
          <EmptyState icon={Users}>No se encontraron fieles.</EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Celular</TableHead>
                <TableHead>Líder</TableHead>
                <TableHead>Cargos</TableHead>
                <TableHead>Bautizado</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fieles.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="text-muted-foreground font-mono text-xs">{f.codigo}</TableCell>
                  <TableCell className="font-medium">
                    {f.nombre} {f.apellido}
                    {f.usuario && <Badge variant="outline" className="ml-2">{f.usuario.rol.toLowerCase()}</Badge>}
                    <div className="text-muted-foreground text-xs font-normal">{f.fechaNacimiento ? edad(f.fechaNacimiento) : f.correo ?? ""}</div>
                  </TableCell>
                  <TableCell className="text-xs">{f.celular ?? "—"}</TableCell>
                  <TableCell className="text-xs">
                    {f.grupo ? (
                      <>
                        {f.grupo.lider ? `${f.grupo.lider.nombre} ${f.grupo.lider.apellido}` : "—"}
                        <div className="text-muted-foreground">{f.grupo.nombre}</div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Sin líder</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex max-w-56 flex-wrap gap-1">
                      {f.areas.length ? f.areas.map((a) => <Badge key={a.id} variant="violet">{a.area.nombre}</Badge>) : <span className="text-muted-foreground text-xs">—</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={f.bautizado ? "info" : "muted"}>{f.bautizado ? "Sí" : "No"}</Badge>
                  </TableCell>
                  <TableCell>
                    <EstadoBadge valor={f.estado} mapa={ESTADO_REGISTRO} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <FormDialog
                        title="Editar fiel"
                        action={guardarFiel.bind(null, f.id)}
                        successMessage="Fiel actualizado"
                        trigger={
                          <Button size="icon-sm" variant="outline" aria-label="Editar">
                            <Pencil />
                          </Button>
                        }
                      >
                        <FielFields fiel={f} lideres={lideres} cargos={cargos} cargosActuales={f.areas.map((a) => a.areaId)} />
                      </FormDialog>
                      {f.estado === "ACTIVO" ? (
                        <ActionButton
                          size="icon-sm"
                          variant="outline"
                          aria-label="Desactivar"
                          confirm={`¿Desactivar a ${f.nombre} ${f.apellido}?`}
                          successMessage="Fiel desactivado"
                          action={cambiarEstadoFiel.bind(null, f.id, "INACTIVO")}
                        >
                          <Ban className="text-red-600" />
                        </ActionButton>
                      ) : (
                        <ActionButton
                          size="icon-sm"
                          variant="outline"
                          aria-label="Reactivar"
                          successMessage="Fiel reactivado"
                          action={cambiarEstadoFiel.bind(null, f.id, "ACTIVO")}
                        >
                          <RotateCcw />
                        </ActionButton>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
