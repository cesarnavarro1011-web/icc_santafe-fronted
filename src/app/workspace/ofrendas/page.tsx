import type { EstadoOfrenda, Prisma, RegistroOfrenda, TipoOfrenda } from "@prisma/client";
import { AlertTriangle, CheckCheck, Clock, HandCoins, MessageSquareWarning, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ActionButton } from "@/components/workspace/action-button";
import { FormDialog } from "@/components/workspace/form-dialog";
import { SearchBar } from "@/components/workspace/search-bar";
import { EmptyState, EstadoBadge, Field, KpiCard, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { dinero, ESTADO_OFRENDA, fecha, opciones, TIPO_OFRENDA, TIPO_SERVICIO } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { R, tieneRol } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { hoyISO } from "@/server/turnos";
import { editarRegistro, eliminarRegistro, observarRegistro, registrarRecaudo, verificarRegistros } from "./actions";

const METODOS = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "NEQUI", label: "Nequi" },
  { value: "DAVIPLATA", label: "Daviplata" },
];

function SelectServicio({ defaultValue = "DOMINGO" }: { defaultValue?: string }) {
  return (
    <NativeSelect name="servicio" defaultValue={defaultValue}>
      {opciones(TIPO_SERVICIO).map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </NativeSelect>
  );
}

function SelectMetodo({ defaultValue = "EFECTIVO" }: { defaultValue?: string }) {
  return (
    <NativeSelect name="metodo" defaultValue={defaultValue}>
      {METODOS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </NativeSelect>
  );
}

/** Últimos 12 meses como opciones "2026-09" → "septiembre de 2026". */
function mesesRecientes() {
  const hoy = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { value, label: d.toLocaleDateString("es-CO", { month: "long", year: "numeric" }) };
  });
}

export default async function OfrendasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mes?: string; tipo?: string; estado?: string; lider?: string }>;
}) {
  const user = await requirePage(R.FINANZAS);
  const { q, mes: mesParam, tipo, estado, lider } = await searchParams;
  const registra = tieneRol(user.rol, R.REGISTRA_OFRENDAS);
  const verifica = tieneRol(user.rol, R.VERIFICA_OFRENDAS);
  const soloPropios = user.rol === "LIDER";

  const meses = mesesRecientes();
  const mes = mesParam && /^\d{4}-\d{2}$/.test(mesParam) ? mesParam : meses[0].value;
  const [anio, m] = mes.split("-").map(Number);
  const desde = new Date(Date.UTC(anio, m - 1, 1));
  const hasta = new Date(Date.UTC(anio, m, 1));
  const etiquetaMes = meses.find((x) => x.value === mes)?.label ?? mes;

  const base: Prisma.RegistroOfrendaWhereInput = {
    fecha: { gte: desde, lt: hasta },
    ...(soloPropios ? { registradoPorId: user.fielId } : lider ? { registradoPorId: lider } : {}),
  };
  const where: Prisma.RegistroOfrendaWhereInput = {
    ...base,
    ...(tipo ? { tipo: tipo as TipoOfrenda } : {}),
    ...(estado ? { estado: estado as EstadoOfrenda } : {}),
    ...(q
      ? {
          OR: [
            { descripcion: { contains: q, mode: "insensitive" } },
            { observacion: { contains: q, mode: "insensitive" } },
            { registradoPor: { nombre: { contains: q, mode: "insensitive" } } },
            { registradoPor: { apellido: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [registros, delMes, registradores] = await Promise.all([
    prisma.registroOfrenda.findMany({
      where,
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      include: { registradoPor: { select: { nombre: true, apellido: true } }, grupo: { select: { nombre: true } } },
    }),
    prisma.registroOfrenda.findMany({ where: base, select: { tipo: true, monto: true, estado: true, registradoPorId: true } }),
    soloPropios
      ? Promise.resolve([])
      : prisma.fiel.findMany({
          where: { ofrendasRegistradas: { some: {} } },
          select: { id: true, nombre: true, apellido: true },
          orderBy: { apellido: "asc" },
        }),
  ]);

  const total = delMes.reduce((s, r) => s + Number(r.monto), 0);
  const porTipo = (Object.keys(TIPO_OFRENDA) as TipoOfrenda[])
    .map((t) => ({ tipo: t, monto: delMes.filter((r) => r.tipo === t).reduce((s, r) => s + Number(r.monto), 0) }))
    .filter((x) => x.monto > 0)
    .sort((a, b) => b.monto - a.monto);
  const porVerificar = delMes.filter((r) => r.estado === "PENDIENTE");
  const observados = delMes.filter((r) => r.estado === "OBSERVADO").length;
  const pendientesIds = registros.filter((r) => r.estado === "PENDIENTE").map((r) => r.id);
  const porLider = registradores
    .map((f) => ({
      nombre: `${f.nombre} ${f.apellido}`,
      monto: delMes.filter((r) => r.registradoPorId === f.id).reduce((s, r) => s + Number(r.monto), 0),
      pendientes: delMes.filter((r) => r.registradoPorId === f.id && r.estado === "PENDIENTE").length,
    }))
    .filter((x) => x.monto > 0)
    .sort((a, b) => b.monto - a.monto);

  const puedeCambiar = (r: RegistroOfrenda) => registra && r.estado !== "VERIFICADO" && (user.rol === "SUPERADMIN" || r.registradoPorId === user.fielId);

  return (
    <>
      <PageHeader
        title="Diezmos y ofrendas"
        description={soloPropios ? `Lo que has registrado en ${etiquetaMes}` : `Control de recaudos · ${etiquetaMes}`}
        actions={
          <>
            {verifica && pendientesIds.length > 0 && (
              <ActionButton
                variant="outline"
                confirm={`¿Marcar como verificados los ${pendientesIds.length} registros pendientes que estás viendo?`}
                successMessage="Registros verificados"
                action={verificarRegistros.bind(null, pendientesIds)}
              >
                <CheckCheck /> Verificar {pendientesIds.length} pendientes
              </ActionButton>
            )}
            {registra && (
              <FormDialog
                title="Registrar recaudo"
                description="Escribe lo recogido en el servicio. Deja en blanco lo que no aplique."
                action={registrarRecaudo}
                successMessage="Recaudo registrado"
                trigger={
                  <Button>
                    <Plus /> Registrar recaudo
                  </Button>
                }
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Fecha">
                    <Input name="fecha" type="date" defaultValue={hoyISO()} max={hoyISO()} required />
                  </Field>
                  <Field label="Servicio">
                    <SelectServicio />
                  </Field>
                  <Field label="Método">
                    <SelectMetodo />
                  </Field>
                </div>
                <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
                  {opciones(TIPO_OFRENDA).map((t) => (
                    <Field key={t.value} label={t.label}>
                      <Input name={`monto_${t.value}`} type="number" min={0} step="any" inputMode="decimal" placeholder="$ 0" />
                    </Field>
                  ))}
                </div>
                <Field label="Observaciones (obligatorio si usas “Otro”)">
                  <Input name="descripcion" placeholder="Ej: ofrenda especial para misiones en Chocó" />
                </Field>
                <p className="text-muted-foreground text-xs">Si recibiste en efectivo y por transferencia, regístralo en dos veces, una por cada método.</p>
              </FormDialog>
            )}
          </>
        }
      />

      <SearchBar
        placeholder="Buscar por observación o por quién registró…"
        filtros={[
          { name: "mes", label: "Mes actual", options: meses.slice(1) },
          { name: "tipo", label: "Todos los tipos", options: opciones(TIPO_OFRENDA) },
          { name: "estado", label: "Todos los estados", options: opciones(ESTADO_OFRENDA) },
          ...(soloPropios ? [] : [{ name: "lider", label: "Todos los líderes", options: registradores.map((f) => ({ value: f.id, label: `${f.nombre} ${f.apellido}` })) }]),
        ]}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={Wallet} label="Total del mes" value={dinero(total)} color="violet" sub={`${delMes.length} registros`} />
        <KpiCard icon={HandCoins} label="Diezmos" value={dinero(porTipo.find((x) => x.tipo === "DIEZMO")?.monto ?? 0)} color="green" progreso={total ? ((porTipo.find((x) => x.tipo === "DIEZMO")?.monto ?? 0) / total) * 100 : 0} />
        <KpiCard icon={Clock} label="Por verificar" value={porVerificar.length} color="amber" sub={dinero(porVerificar.reduce((s, r) => s + Number(r.monto), 0))} />
        <KpiCard icon={AlertTriangle} label="Con observación" value={observados} color={observados ? "red" : "slate"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Por tipo">
          {porTipo.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin recaudos este mes.</p>
          ) : (
            <ul className="space-y-3">
              {porTipo.map((x) => (
                <li key={x.tipo}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{TIPO_OFRENDA[x.tipo].label}</span>
                    <span className="font-semibold tabular-nums">{dinero(x.monto)}</span>
                  </div>
                  <Progress value={(x.monto / total) * 100} barClassName="bg-violet-500" />
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {!soloPropios && (
          <Panel title="Por líder">
            {porLider.length === 0 ? (
              <p className="text-muted-foreground text-sm">Ningún líder ha registrado este mes.</p>
            ) : (
              <ul className="divide-y">
                {porLider.map((x) => (
                  <li key={x.nombre} className="flex items-center justify-between py-2 text-sm">
                    <span>{x.nombre}</span>
                    <span className="flex items-center gap-2">
                      {x.pendientes > 0 && <span className="text-xs text-amber-600">{x.pendientes} por verificar</span>}
                      <strong className="tabular-nums">{dinero(x.monto)}</strong>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </div>

      <Panel title="Registros">
        {registros.length === 0 ? (
          <EmptyState icon={HandCoins}>No hay registros con estos filtros.</EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                {!soloPropios && <TableHead>Registró</TableHead>}
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {registros.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{fecha(r.fecha)}</TableCell>
                  <TableCell>
                    <EstadoBadge valor={r.servicio} mapa={TIPO_SERVICIO} />
                  </TableCell>
                  <TableCell>
                    <EstadoBadge valor={r.tipo} mapa={TIPO_OFRENDA} />
                    {r.descripcion && <div className="text-muted-foreground mt-0.5 max-w-48 truncate text-xs">{r.descripcion}</div>}
                  </TableCell>
                  <TableCell className="text-xs">{METODOS.find((x) => x.value === r.metodo)?.label ?? r.metodo}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{dinero(r.monto)}</TableCell>
                  {!soloPropios && (
                    <TableCell className="text-xs">
                      {r.registradoPor.nombre} {r.registradoPor.apellido}
                      {r.grupo && <div className="text-muted-foreground">{r.grupo.nombre}</div>}
                    </TableCell>
                  )}
                  <TableCell>
                    <EstadoBadge valor={r.estado} mapa={ESTADO_OFRENDA} />
                    {r.observacion && <div className="mt-0.5 max-w-48 text-xs text-red-600">{r.observacion}</div>}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      {verifica && r.estado !== "VERIFICADO" && (
                        <ActionButton size="icon-sm" variant="outline" aria-label="Verificar" title="Verificar" successMessage="Verificado" action={verificarRegistros.bind(null, [r.id])}>
                          <CheckCheck className="text-emerald-600" />
                        </ActionButton>
                      )}
                      {verifica && (
                        <FormDialog
                          title="Observación"
                          description="El líder verá la observación y podrá corregir el registro."
                          action={observarRegistro.bind(null, r.id)}
                          successMessage="Observación guardada"
                          trigger={
                            <Button size="icon-sm" variant="outline" aria-label="Observar" title="Agregar observación">
                              <MessageSquareWarning className="text-amber-600" />
                            </Button>
                          }
                        >
                          <Field label="Observación">
                            <Textarea name="observacion" rows={3} defaultValue={r.observacion ?? ""} placeholder="Ej: el conteo físico dio $20.000 menos" required />
                          </Field>
                        </FormDialog>
                      )}
                      {puedeCambiar(r) && (
                        <>
                          <FormDialog
                            title="Corregir registro"
                            description="Al guardar vuelve a quedar pendiente de verificación."
                            action={editarRegistro.bind(null, r.id)}
                            successMessage="Registro corregido"
                            trigger={
                              <Button size="icon-sm" variant="outline" aria-label="Corregir">
                                <Pencil />
                              </Button>
                            }
                          >
                            <div className="grid gap-4 sm:grid-cols-2">
                              <Field label="Fecha">
                                <Input name="fecha" type="date" defaultValue={r.fecha.toISOString().slice(0, 10)} max={hoyISO()} required />
                              </Field>
                              <Field label="Servicio">
                                <SelectServicio defaultValue={r.servicio} />
                              </Field>
                              <Field label="Tipo">
                                <NativeSelect name="tipo" defaultValue={r.tipo}>
                                  {opciones(TIPO_OFRENDA).map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </NativeSelect>
                              </Field>
                              <Field label="Método">
                                <SelectMetodo defaultValue={r.metodo} />
                              </Field>
                              <Field label="Monto">
                                <Input name="monto" type="number" min={0} step="any" defaultValue={Number(r.monto)} required />
                              </Field>
                              <Field label="Observaciones">
                                <Input name="descripcion" defaultValue={r.descripcion ?? ""} />
                              </Field>
                            </div>
                          </FormDialog>
                          <ActionButton size="icon-sm" variant="ghost" aria-label="Eliminar" confirm="¿Eliminar este registro?" successMessage="Registro eliminado" action={eliminarRegistro.bind(null, r.id)}>
                            <Trash2 className="text-red-600" />
                          </ActionButton>
                        </>
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
