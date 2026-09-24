import type { Prisma, Rol } from "@prisma/client";
import { Ban, CheckCircle, KeyRound, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionButton } from "@/components/workspace/action-button";
import { FormDialog } from "@/components/workspace/form-dialog";
import { SearchBar } from "@/components/workspace/search-bar";
import { EmptyState, Field, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { fechaHora } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { R, ROL_LABEL, ROLES } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { cambiarActivo, cambiarRol } from "./actions";
import { CrearAccesoDialog, RestablecerButton } from "./dialogos";

const ROL_VARIANT = {
  SUPERADMIN: "danger",
  PASTOR: "violet",
  SUPERVISOR: "info",
  LIDER: "success",
  MAESTRO: "warning",
  ESTUDIANTE: "muted",
} as const;

const DESCRIPCION_ROL: Record<Rol, string> = {
  SUPERADMIN: "Todo el sistema, incluidos otros superadmins",
  PASTOR: "Administración completa de la iglesia y firma final de certificados",
  SUPERVISOR: "Supervisa cursos asignados, control de calidad y firma certificados",
  LIDER: "Fieles, asistencia de la iglesia y bautismos",
  MAESTRO: "Enseña sus cursos: tareas, exámenes, asistencia y aprobación",
  ESTUDIANTE: "Sus cursos, tareas, exámenes y certificados",
};

export default async function UsuariosPage({ searchParams }: { searchParams: Promise<{ q?: string; rol?: string }> }) {
  const actor = await requirePage(R.ADMIN);
  const { q, rol } = await searchParams;
  const where: Prisma.UsuarioWhereInput = {
    ...(rol ? { rol: rol as Rol } : {}),
    ...(q
      ? {
          OR: [
            { usuario: { contains: q, mode: "insensitive" } },
            { fiel: { nombre: { contains: q, mode: "insensitive" } } },
            { fiel: { apellido: { contains: q, mode: "insensitive" } } },
            { fiel: { codigo: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [usuarios, sinAcceso] = await Promise.all([
    prisma.usuario.findMany({ where, include: { fiel: true }, orderBy: [{ rol: "asc" }, { fiel: { apellido: "asc" } }] }),
    prisma.fiel.findMany({ where: { usuario: null, estado: "ACTIVO" }, orderBy: [{ apellido: "asc" }, { nombre: "asc" }] }),
  ]);
  const rolesAsignables = ROLES.filter((r) => r !== "SUPERADMIN" || actor.rol === "SUPERADMIN").map((r) => ({ value: r, label: ROL_LABEL[r] }));

  return (
    <>
      <PageHeader
        title="Usuarios y roles"
        description={`${usuarios.length} accesos · ${sinAcceso.length} fieles activos sin acceso`}
        actions={<CrearAccesoDialog roles={rolesAsignables} fieles={sinAcceso.map((f) => ({ value: f.id, label: `${f.apellido} ${f.nombre} · ${f.codigo}` }))} />}
      />
      <Panel title="Roles del espacio de estudio">
        <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((r) => (
            <div key={r} className="flex gap-2">
              <Badge variant={ROL_VARIANT[r]} className="h-fit">
                {ROL_LABEL[r]}
              </Badge>
              <span className="text-muted-foreground text-xs">{DESCRIPCION_ROL[r]}</span>
            </div>
          ))}
        </dl>
      </Panel>
      <SearchBar placeholder="Buscar por nombre, usuario o ID..." filtros={[{ name: "rol", label: "Todos los roles", options: ROLES.map((r) => ({ value: r, label: ROL_LABEL[r] })) }]} />
      <Panel>
        {usuarios.length === 0 ? (
          <EmptyState icon={UserCog}>Sin usuarios.</EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Persona</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último acceso</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => {
                const propio = u.id === actor.id;
                const protegido = u.rol === "SUPERADMIN" && actor.rol !== "SUPERADMIN";
                const editable = !propio && !protegido;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.fiel.nombre} {u.fiel.apellido}
                      <div className="text-muted-foreground font-mono text-xs">{u.fiel.codigo}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{u.usuario}</TableCell>
                    <TableCell>
                      <Badge variant={ROL_VARIANT[u.rol]}>{ROL_LABEL[u.rol]}</Badge>
                    </TableCell>
                    <TableCell>
                      {u.activo ? <Badge variant="success">Activo</Badge> : <Badge variant="muted">Inactivo</Badge>}
                      {u.debeCambiarPassword && (
                        <Badge variant="warning" className="ml-1">
                          clave temporal
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{u.ultimoAcceso ? fechaHora(u.ultimoAcceso) : "Nunca"}</TableCell>
                    <TableCell>
                      {editable && (
                        <div className="flex justify-end gap-1.5">
                          <FormDialog
                            title={`Cambiar rol · ${u.fiel.nombre} ${u.fiel.apellido}`}
                            action={cambiarRol.bind(null, u.id)}
                            successMessage="Rol actualizado"
                            trigger={
                              <Button size="icon-sm" variant="outline" aria-label="Cambiar rol" title="Cambiar rol">
                                <UserCog />
                              </Button>
                            }
                          >
                            <Field label="Rol">
                              <NativeSelect name="rol" defaultValue={u.rol}>
                                {rolesAsignables.map((r) => (
                                  <option key={r.value} value={r.value}>
                                    {r.label}
                                  </option>
                                ))}
                              </NativeSelect>
                            </Field>
                            <p className="text-muted-foreground text-xs">El cambio aplica la próxima vez que la persona inicie sesión.</p>
                          </FormDialog>
                          <RestablecerButton usuarioId={u.id} nombre={`${u.fiel.nombre} ${u.fiel.apellido}`} />
                          {u.activo ? (
                            <ActionButton size="icon-sm" variant="outline" aria-label="Desactivar" title="Desactivar" confirm="¿Desactivar este acceso?" successMessage="Acceso desactivado" action={cambiarActivo.bind(null, u.id, false)}>
                              <Ban className="text-red-600" />
                            </ActionButton>
                          ) : (
                            <ActionButton size="icon-sm" variant="outline" aria-label="Activar" title="Activar" successMessage="Acceso activado" action={cambiarActivo.bind(null, u.id, true)}>
                              <CheckCircle className="text-emerald-600" />
                            </ActionButton>
                          )}
                        </div>
                      )}
                      {propio && (
                        <span className="text-muted-foreground flex items-center justify-end gap-1 text-xs">
                          <KeyRound className="size-3" /> Tú
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
