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
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { cambiarEstadoFiel, guardarFiel } from "./actions";
import { FielFields } from "./fiel-form";

export default async function FielesPage({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  await requirePage(R.PASTORAL);
  const { q, estado } = await searchParams;

  const where: Prisma.FielWhereInput = {
    ...(estado ? { estado: estado as EstadoRegistro } : {}),
    ...(q
      ? {
          OR: ["codigo", "nombre", "apellido", "correo", "celular"].map((campo) => ({
            [campo]: { contains: q, mode: "insensitive" },
          })),
        }
      : {}),
  };
  const [fieles, total] = await Promise.all([
    prisma.fiel.findMany({ where, orderBy: [{ apellido: "asc" }, { nombre: "asc" }], take: 300, include: { usuario: { select: { rol: true } } } }),
    prisma.fiel.count(),
  ]);

  return (
    <>
      <PageHeader
        title="Gestión de fieles"
        description={`${total} registros`}
        actions={
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
            <FielFields />
          </FormDialog>
        }
      />
      <SearchBar
        placeholder="Buscar por nombre, ID, correo o celular..."
        filtros={[{ name: "estado", label: "Todos los estados", options: [{ value: "ACTIVO", label: "Activo" }, { value: "INACTIVO", label: "Inactivo" }] }]}
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
                <TableHead>Edad</TableHead>
                <TableHead>Celular</TableHead>
                <TableHead>Correo</TableHead>
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
                  </TableCell>
                  <TableCell className="text-xs">{edad(f.fechaNacimiento)}</TableCell>
                  <TableCell className="text-xs">{f.celular ?? "—"}</TableCell>
                  <TableCell className="text-xs">{f.correo ?? "—"}</TableCell>
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
                        <FielFields fiel={f} />
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
