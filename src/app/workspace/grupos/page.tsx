import type { Grupo } from "@prisma/client";
import { Pencil, Plus, Trash2, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { ActionButton } from "@/components/workspace/action-button";
import { FormDialog } from "@/components/workspace/form-dialog";
import { OpcionSelect } from "@/components/workspace/opcion-select";
import { EmptyState, EstadoBadge, Field, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { ESTADO_REGISTRO, fecha } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { opcionesFieles, type Opcion } from "@/server/opciones";
import { hoyISO, lunesDe } from "@/server/turnos";
import { eliminarGrupo, guardarGrupo } from "./actions";
import { MiembrosDialog } from "./miembros-dialog";

function GrupoFields({ g, lideres }: { g?: Grupo; lideres: Opcion[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nombre *">
        <Input name="nombre" defaultValue={g?.nombre} placeholder="Ej: Jóvenes, Matrimonios, Célula Norte" required />
      </Field>
      <Field label="Líder">
        <OpcionSelect name="liderId" opciones={lideres} defaultValue={g?.liderId ?? ""} placeholder="— Sin líder —" />
      </Field>
      <Field label="Descripción" className="sm:col-span-2">
        <Input name="descripcion" defaultValue={g?.descripcion ?? ""} />
      </Field>
      <Field label="Estado">
        <NativeSelect name="estado" defaultValue={g?.estado ?? "ACTIVO"}>
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </NativeSelect>
      </Field>
      <p className="text-muted-foreground self-end text-xs sm:col-span-2">
        Solo aparecen fieles con acceso y rol <strong>Líder</strong> (se asigna en Usuarios y roles).
      </p>
    </div>
  );
}

export default async function GruposPage() {
  await requirePage(R.ADMIN);
  const lunes = lunesDe(hoyISO());
  const [grupos, lideres, fieles] = await Promise.all([
    prisma.grupo.findMany({
      orderBy: [{ estado: "asc" }, { nombre: "asc" }],
      include: {
        lider: true,
        miembros: { include: { usuario: { select: { rol: true } } }, orderBy: [{ apellido: "asc" }] },
        turnos: { where: { semana: { gte: lunes } }, orderBy: { semana: "asc" }, take: 1 },
      },
    }),
    opcionesFieles({ roles: ["LIDER"], conCodigo: false }),
    prisma.fiel.findMany({
      where: { estado: "ACTIVO" },
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, apellido: true, grupo: { select: { nombre: true } } },
    }),
  ]);
  const opcionesMiembros = fieles.map((f) => ({ id: f.id, nombre: `${f.apellido} ${f.nombre}`, grupoActual: f.grupo?.nombre ?? null }));
  const sinGrupo = fieles.filter((f) => !f.grupo).length;

  return (
    <>
      <PageHeader
        title="Grupos y líderes"
        description={`${grupos.length} grupos · ${sinGrupo} fieles activos sin grupo`}
        actions={
          <FormDialog
            title="Nuevo grupo"
            action={guardarGrupo.bind(null, null)}
            successMessage="Grupo creado"
            trigger={
              <Button>
                <Plus /> Nuevo grupo
              </Button>
            }
          >
            <GrupoFields lideres={lideres} />
          </FormDialog>
        }
      />
      {grupos.length === 0 ? (
        <Panel>
          <EmptyState icon={UsersRound}>Crea el primer grupo y asígnale un líder y sus fieles. Luego ponlo en el cronograma de asistencia.</EmptyState>
        </Panel>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {grupos.map((g) => {
            return (
              <section key={g.id} className="bg-card flex flex-col rounded-2xl border shadow-sm">
                <div className="flex items-start justify-between gap-2 border-b p-4">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{g.nombre}</h3>
                    <p className="text-muted-foreground text-xs">
                      Líder: {g.lider ? `${g.lider.nombre} ${g.lider.apellido}` : <span className="text-amber-600">sin asignar</span>}
                    </p>
                  </div>
                  <EstadoBadge valor={g.estado} mapa={ESTADO_REGISTRO} />
                </div>
                <div className="flex-1 space-y-3 p-4 text-sm">
                  <div className="flex gap-4">
                    <span>
                      <strong className="tabular-nums">{g.miembros.length}</strong> <span className="text-muted-foreground">miembros</span>
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Próximo turno: {g.turnos[0] ? `semana del ${fecha(g.turnos[0].semana)}` : "sin programar"}
                  </p>
                  {g.descripcion && <p className="text-muted-foreground text-xs">{g.descripcion}</p>}
                </div>
                <div className="flex flex-wrap gap-2 border-t p-3">
                  <MiembrosDialog grupoId={g.id} grupo={g.nombre} fieles={opcionesMiembros} liderId={g.liderId} />
                  <FormDialog
                    title="Editar grupo"
                    action={guardarGrupo.bind(null, g.id)}
                    successMessage="Grupo actualizado"
                    trigger={
                      <Button size="sm" variant="outline">
                        <Pencil /> Editar
                      </Button>
                    }
                  >
                    <GrupoFields g={g} lideres={lideres} />
                  </FormDialog>
                  <ActionButton
                    size="icon-sm"
                    variant="ghost"
                    className="ml-auto"
                    aria-label="Eliminar grupo"
                    confirm={`¿Eliminar el grupo "${g.nombre}"? Sus miembros quedarán sin grupo y se borran sus turnos.`}
                    successMessage="Grupo eliminado"
                    action={eliminarGrupo.bind(null, g.id)}
                  >
                    <Trash2 className="text-red-600" />
                  </ActionButton>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
