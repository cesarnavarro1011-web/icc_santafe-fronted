import Link from "next/link";
import {
  AlertTriangle,
  Award,
  BookOpen,
  CalendarCheck,
  CalendarRange,
  CheckCheck,
  Church,
  Clock,
  DollarSign,
  Droplets,
  HandCoins,
  GraduationCap,
  Inbox,
  Presentation,
  ShieldCheck,
  Signature,
  UserPlus,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";
import { KpiCard, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { dinero } from "@/lib/labels";
import { R, ROL_LABEL, tieneRol } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import {
  dashboardAcademia,
  dashboardIglesia,
  dashboardLider,
  dashboardMaestro,
  dashboardSupervisor,
  dashboardSupervisores,
} from "@/server/dashboards";
import { TableroEstudiante } from "./tablero-estudiante";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { hoyISO, lunesDe, permisoRegistro, turnosDeSemana } from "@/server/turnos";

function Atajo({ href, icon: Icon, label }: { href: string; icon: typeof Users; label: string }) {
  return (
    <Link href={href} className="bg-card hover:bg-accent flex items-center gap-3 rounded-xl border p-4 text-sm font-semibold transition">
      <span className="flex size-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
        <Icon className="size-4" />
      </span>
      {label}
    </Link>
  );
}

function Seccion({ titulo, accion, children }: { titulo: string; accion?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">{titulo}</h2>
        {accion}
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{children}</div>
    </section>
  );
}

/** Pestañas del Inicio del pastor: Iglesia | Academia (?vista=). */
function PestanasInicio({ activo }: { activo: "iglesia" | "academia" }) {
  const tabs = [
    { key: "iglesia", label: "Iglesia", icon: Church },
    { key: "academia", label: "Academia", icon: GraduationCap },
  ] as const;
  return (
    <div className="bg-muted inline-flex w-fit gap-1 rounded-xl p-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.key === "iglesia" ? "/workspace" : "/workspace?vista=academia"}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition",
            activo === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <t.icon className="size-4" /> {t.label}
        </Link>
      ))}
    </div>
  );
}

export default async function InicioPage({ searchParams }: { searchParams: Promise<{ denegado?: string; vista?: string }> }) {
  const user = await requirePage();
  const { denegado, vista } = await searchParams;
  const apartado = vista === "academia" ? "academia" : "iglesia";
  const nombre = user.name.split(" ")[0];

  return (
    <>
      <PageHeader title={`Hola, ${nombre}`} description={tieneRol(user.rol, R.APRENDIZ) ? "Este es tu espacio de estudio. Tus cursos están en el menú de la izquierda." : `Bienvenido a tu espacio de estudio · ${ROL_LABEL[user.rol]}`} />
      {denegado && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          No tienes permiso para entrar a esa sección.
        </p>
      )}

      {tieneRol(user.rol, R.ADMIN) ? (
        <>
          <PestanasInicio activo={apartado} />
          {apartado === "iglesia" ? (
            <>
              <TurnoSemana />
              <TableroIglesia />
            </>
          ) : (
            <TableroAcademia />
          )}
        </>
      ) : (
        tieneRol(user.rol, R.ASISTENCIA_IGLESIA) && <TurnoSemana />
      )}
      {user.rol === "LIDER" && <TableroLider />}
      {user.rol === "SUPERVISOR" && <TableroSupervisor />}
      {user.rol === "MAESTRO" && <TableroMaestro />}
      <TableroEstudiante fielId={user.fielId} compacto={!tieneRol(user.rol, R.APRENDIZ)} />
    </>
  );

  /** Apartado "Iglesia" del pastor: membresía, asistencia, grupos y finanzas del mes. */
  async function TableroIglesia() {
    const s = await dashboardIglesia();
    const f = s.finanzas;
    return (
      <>
        <Seccion titulo="Membresía y asistencia">
          <KpiCard icon={Users} label="Fieles activos" value={s.fielesActivos} color="violet" sub={`${s.totalFieles} registrados · ${s.nuevosMes} nuevos este mes`} progreso={s.totalFieles ? (s.fielesActivos / s.totalFieles) * 100 : 0} />
          <KpiCard icon={Droplets} label="Bautizados" value={s.bautizados} color="blue" sub="de los fieles activos" progreso={s.fielesActivos ? (s.bautizados / s.fielesActivos) * 100 : 0} />
          <KpiCard icon={CalendarCheck} label="Promedio por domingo" value={s.promedioDomingo} color="green" sub={`Últimas 4 semanas · ${s.asistenciasHoy} registros hoy`} />
          <KpiCard icon={UsersRound} label="Grupos activos" value={s.grupos} color="teal" sub={s.sinGrupo ? `${s.sinGrupo} fieles sin líder` : "Todos los fieles tienen líder"} />
        </Seccion>
        <Seccion titulo="Diezmos y ofrendas del mes" accion={<Link href="/workspace/ofrendas" className="text-sm text-violet-700 hover:underline">Ver control</Link>}>
          <KpiCard
            icon={Wallet}
            label="Total recaudado"
            value={dinero(f.total)}
            color="violet"
            sub={f.variacion === null ? "Sin datos del mes anterior" : `${f.variacion >= 0 ? "▲" : "▼"} ${Math.abs(f.variacion)}% vs. mes anterior`}
          />
          <KpiCard icon={HandCoins} label="Diezmos" value={dinero(f.diezmos)} color="green" progreso={f.total ? (f.diezmos / f.total) * 100 : 0} />
          <KpiCard icon={HandCoins} label="Ofrendas y otros" value={dinero(f.ofrendas + f.otros)} color="blue" sub={`Ofrendas ${dinero(f.ofrendas)} · otros ${dinero(f.otros)}`} />
          <KpiCard icon={Clock} label="Por verificar" value={f.porVerificar} color={f.porVerificar ? "amber" : "slate"} sub={f.porVerificar ? dinero(f.montoPorVerificar) : "Todo verificado"} />
        </Seccion>
        <div className="grid gap-3 md:grid-cols-4">
          <Atajo href="/workspace/fieles" icon={Users} label="Fieles" />
          <Atajo href="/workspace/grupos" icon={UsersRound} label="Grupos y líderes" />
          <Atajo href="/workspace/cronograma" icon={CalendarRange} label="Cronograma de asistencia" />
          <Atajo href="/workspace/ofrendas" icon={HandCoins} label="Diezmos y ofrendas" />
        </div>
      </>
    );
  }

  /** Apartado "Academia" del pastor: cursos, estudiantes, certificados y supervisores. */
  async function TableroAcademia() {
    const s = await dashboardAcademia();
    return (
      <>
        <Seccion titulo="Estudiantes y cursos">
          <KpiCard icon={BookOpen} label="Estudiantes cursando" value={s.enCurso} color="blue" sub={`en ${s.cursos} cursos activos`} />
          <KpiCard icon={GraduationCap} label="Aprobados" value={s.aprobados} color="green" anillo={s.tasaAprobacion} sub={`${s.tasaAprobacion}% de las matrículas`} />
          <KpiCard icon={AlertTriangle} label="Matrículas vencidas" value={s.vencidos} color={s.vencidos ? "red" : "slate"} sub="en progreso con fecha vencida" />
          <KpiCard icon={Inbox} label="Tareas por revisar" value={s.tareasPendientes} color="amber" sub="esperando a los maestros" />
        </Seccion>
        <Seccion titulo="Certificados e inscripciones">
          <KpiCard icon={Award} label="Certificados emitidos" value={s.certificados} color="teal" />
          <KpiCard icon={Signature} label="Esperan tu firma" value={s.certsPorFirmar} color={s.certsPorFirmar ? "violet" : "slate"} sub="ya firmados por el supervisor" />
          <KpiCard icon={DollarSign} label="Ingresos por cursos (mes)" value={dinero(s.ingresosMes)} color="indigo" />
          <KpiCard icon={UserPlus} label="Solicitudes de inscripción" value={s.inscripcionesPendientes} color={s.inscripcionesPendientes ? "amber" : "slate"} sub="pagos pendientes" />
        </Seccion>
        <div className="grid gap-3 md:grid-cols-3">
          <Atajo href="/workspace/certificados" icon={Award} label="Certificados por firmar" />
          <Atajo href="/workspace/inscripciones" icon={DollarSign} label="Inscripciones y pagos" />
          <Atajo href="/workspace/control-calidad" icon={ShieldCheck} label="Control de calidad" />
        </div>
        <PanelSupervisores />
      </>
    );
  }

  /** El pastor audita a sus supervisores: carga, firmas pendientes, clases y alertas. */
  async function PanelSupervisores() {
    const sup = await dashboardSupervisores();
    return (
      <Panel
        title={<span className="flex items-center gap-2"><ShieldCheck className="size-4 text-violet-500" /> Supervisores</span>}
        actions={<Link href="/workspace/asignaciones" className="text-sm text-violet-700 hover:underline">Asignar</Link>}
      >
        {sup.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay supervisores. Crea usuarios con rol Supervisor y asígnales cursos.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supervisor</TableHead>
                <TableHead>Cursos</TableHead>
                <TableHead className="text-right">Estudiantes</TableHead>
                <TableHead className="text-right">Clases (30 d)</TableHead>
                <TableHead className="text-right">Certificados por firmar</TableHead>
                <TableHead className="text-right">Alertas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sup.map((x) => (
                <TableRow key={x.id}>
                  <TableCell className="font-medium">{x.nombre}</TableCell>
                  <TableCell className="text-xs">
                    {x.cursos.length ? x.cursos.join(", ") : <span className="text-amber-600">Sin cursos asignados</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{x.estudiantes}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", x.cursos.length > 0 && x.clases30 === 0 && "font-semibold text-amber-600")}>{x.clases30}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {x.certsPendientes}
                    {x.certsPendientes > 0 && (
                      <span className={cn("ml-1 text-xs", x.diasSinFirmar > 7 ? "text-red-600" : "text-muted-foreground")}>({x.diasSinFirmar} d)</span>
                    )}
                  </TableCell>
                  <TableCell className={cn("text-right tabular-nums", x.alertas > 0 && "font-semibold text-red-600")}>{x.alertas}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    );
  }

  /** Quién registra la asistencia de la iglesia esta semana (y si te toca a ti). */
  async function TurnoSemana() {
    const hoy = hoyISO();
    const [turnos, permiso] = await Promise.all([turnosDeSemana(lunesDe(hoy)), permisoRegistro(user, hoy)]);
    const meToca = permiso.puede && !permiso.libre;
    // Al marcador solo se le avisa cuando le toca; pastor, superadmin y líder siempre ven el turno
    if (!meToca && user.rol === "MARCADOR") return null;
    return (
      <div className={cn("flex flex-wrap items-center gap-3 rounded-xl border p-4", meToca ? "border-emerald-200 bg-emerald-50" : "bg-card")}>
        <CalendarRange className={cn("size-5", meToca ? "text-emerald-600" : "text-violet-500")} />
        <div className="min-w-0 flex-1 text-sm">
          {meToca ? (
            <p className="font-semibold text-emerald-800">Esta semana tu grupo registra la asistencia de los servicios.</p>
          ) : (
            <p>
              <span className="text-muted-foreground">Turno de asistencia esta semana: </span>
              <strong>{turnos.length ? turnos.map((t) => t.grupo.nombre).join(", ") : "sin asignar"}</strong>
            </p>
          )}
        </div>
        <Button size="sm" variant={meToca ? "default" : "outline"} asChild>
          <Link href={meToca ? "/workspace/asistencia" : "/workspace/cronograma"}>{meToca ? "Registrar asistencia" : "Ver cronograma"}</Link>
        </Button>
      </div>
    );
  }

  async function TableroLider() {
    const s = await dashboardLider();
    return (
      <>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard icon={Users} label="Fieles activos" value={s.fielesActivos} color="violet" />
          <KpiCard icon={Droplets} label="Bautizados" value={s.bautizados} color="blue" />
          <KpiCard icon={CalendarCheck} label="Asistencias hoy" value={s.asistenciasHoy} color="green" />
          <KpiCard icon={UserPlus} label="Invitados (30 días)" value={s.invitados30} color="amber" sub={`${s.asistencias30} asistencias en 30 días`} />
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <Atajo href="/workspace/fieles" icon={Users} label="Fieles" />
          <Atajo href="/workspace/asistencia" icon={CalendarCheck} label="Asistencia" />
          <Atajo href="/workspace/bautismos" icon={Droplets} label="Bautismos" />
          <Atajo href="/workspace/ofrendas" icon={HandCoins} label="Registrar diezmos y ofrendas" />
        </div>
      </>
    );
  }

  async function TableroSupervisor() {
    const s = await dashboardSupervisor(user);
    return (
      <>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard icon={BookOpen} label="Cursos supervisados" value={s.cursos} color="violet" />
          <KpiCard icon={Users} label="Estudiantes activos" value={s.estudiantes} color="blue" />
          <KpiCard icon={AlertTriangle} label="Alertas" value={s.alertas.length} color="red" />
          <KpiCard icon={Award} label="Certificados por firmar" value={s.certsPendientes} color="amber" />
        </div>
        {s.alertas.length > 0 && (
          <Panel title="Alertas de integridad">
            <ul className="space-y-2">
              {s.alertas.slice(0, 10).map((a) => (
                <li key={a.id} className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <strong>{a.tipo}</strong> — {a.fiel} · {a.curso}
                  <div className="text-xs opacity-75">{a.detalle}</div>
                </li>
              ))}
            </ul>
          </Panel>
        )}
        <div className="grid gap-3 md:grid-cols-3">
          <Atajo href="/workspace/control-calidad" icon={ShieldCheck} label="Control de calidad" />
          <Atajo href="/workspace/certificados" icon={Award} label="Firmar certificados" />
          <Atajo href="/workspace/asistencia-cursos" icon={CalendarCheck} label="Asistencia de cursos" />
        </div>
      </>
    );
  }

  async function TableroMaestro() {
    const s = await dashboardMaestro(user);
    return (
      <>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard icon={Presentation} label="Cursos asignados" value={s.cursos} color="violet" />
          <KpiCard icon={Users} label="Estudiantes" value={s.estudiantes} color="blue" />
          <KpiCard icon={Inbox} label="Tareas pendientes" value={s.pendientes} color="amber" />
          <KpiCard icon={CheckCheck} label="Calificadas" value={s.calificadas} color="green" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Atajo href="/workspace/tareas" icon={Inbox} label="Revisar tareas" />
          <Atajo href="/workspace/calificar-examenes" icon={CheckCheck} label="Calificar exámenes" />
          <Atajo href="/workspace/clases" icon={Presentation} label="Mis clases" />
        </div>
      </>
    );
  }
}
