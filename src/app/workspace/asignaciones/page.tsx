import { Plus, Trash2, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionButton } from "@/components/workspace/action-button";
import { FormDialog } from "@/components/workspace/form-dialog";
import { OpcionSelect } from "@/components/workspace/opcion-select";
import { EmptyState, Field, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { ROL_MAESTRO } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { opcionesCursos, opcionesFieles } from "@/server/opciones";
import { asignarMaestro, asignarSupervisor, quitarMaestro, quitarSupervisor } from "./actions";

export default async function AsignacionesPage() {
  await requirePage(R.ADMIN);
  const [maestros, supervisores, cursos, candidatosMaestro, candidatosSupervisor] = await Promise.all([
    prisma.asignacionMaestro.findMany({ include: { fiel: true, curso: true }, orderBy: [{ curso: { nombre: "asc" } }, { nivel: "asc" }] }),
    prisma.asignacionSupervisor.findMany({ include: { fiel: true, curso: true }, orderBy: { curso: { nombre: "asc" } } }),
    opcionesCursos(),
    opcionesFieles({ roles: ["MAESTRO", "PASTOR", "SUPERADMIN"] }),
    opcionesFieles({ roles: ["SUPERVISOR", "PASTOR", "SUPERADMIN"] }),
  ]);

  const ayuda = (
    <p className="text-muted-foreground text-xs">
      Solo aparecen fieles con acceso al sistema y el rol adecuado. Créalo en <strong>Usuarios y roles</strong>.
    </p>
  );

  return (
    <>
      <PageHeader title="Maestros y supervisores" description="Quién enseña y quién supervisa cada curso" />
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Maestros asignados"
          actions={
            <FormDialog
              title="Asignar maestro"
              action={asignarMaestro}
              successMessage="Maestro asignado"
              trigger={
                <Button size="sm">
                  <Plus /> Asignar
                </Button>
              }
            >
              <Field label="Maestro *">
                <OpcionSelect name="fielId" opciones={candidatosMaestro} required />
              </Field>
              <Field label="Curso *">
                <OpcionSelect name="cursoId" opciones={cursos} required />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nivel (vacío = todos)">
                  <Input name="nivel" type="number" min={1} />
                </Field>
                <Field label="Rol">
                  <NativeSelect name="rol" defaultValue="TITULAR">
                    <option value="TITULAR">Titular</option>
                    <option value="AUXILIAR">Auxiliar</option>
                  </NativeSelect>
                </Field>
              </div>
              {ayuda}
            </FormDialog>
          }
        >
          {maestros.length === 0 ? (
            <EmptyState icon={UserCog}>Sin maestros asignados.</EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Maestro</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {maestros.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.fiel.nombre} {m.fiel.apellido}
                    </TableCell>
                    <TableCell>
                      <Badge variant="violet">{m.curso.nombre}</Badge>
                    </TableCell>
                    <TableCell>{m.nivel ?? "Todos"}</TableCell>
                    <TableCell>{ROL_MAESTRO[m.rol]}</TableCell>
                    <TableCell className="text-right">
                      <ActionButton size="icon-sm" variant="ghost" aria-label="Quitar" confirm="¿Quitar esta asignación?" successMessage="Asignación eliminada" action={quitarMaestro.bind(null, m.id)}>
                        <Trash2 className="text-red-600" />
                      </ActionButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>

        <Panel
          title="Supervisores"
          actions={
            <FormDialog
              title="Asignar supervisor"
              action={asignarSupervisor}
              successMessage="Supervisor asignado"
              trigger={
                <Button size="sm">
                  <Plus /> Asignar
                </Button>
              }
            >
              <Field label="Supervisor *">
                <OpcionSelect name="fielId" opciones={candidatosSupervisor} required />
              </Field>
              <Field label="Curso *">
                <OpcionSelect name="cursoId" opciones={cursos} required />
              </Field>
              <Field label="Niveles autorizados">
                <Input name="nivelAutorizado" defaultValue="Todos" />
              </Field>
              {ayuda}
            </FormDialog>
          }
        >
          {supervisores.length === 0 ? (
            <EmptyState icon={UserCog}>Sin supervisores asignados.</EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Niveles</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {supervisores.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {s.fiel.nombre} {s.fiel.apellido}
                    </TableCell>
                    <TableCell>
                      <Badge variant="violet">{s.curso.nombre}</Badge>
                    </TableCell>
                    <TableCell>{s.nivelAutorizado}</TableCell>
                    <TableCell className="text-right">
                      <ActionButton size="icon-sm" variant="ghost" aria-label="Quitar" confirm="¿Quitar esta asignación?" successMessage="Asignación eliminada" action={quitarSupervisor.bind(null, s.id)}>
                        <Trash2 className="text-red-600" />
                      </ActionButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>
      </div>
    </>
  );
}
