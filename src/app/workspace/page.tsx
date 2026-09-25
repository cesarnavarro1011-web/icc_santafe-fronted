import Link from "next/link";
import {
  AlertTriangle,
  Award,
  BookOpen,
  CalendarCheck,
  CalendarRange,
  CheckCheck,
  DollarSign,
  Droplets,
  GraduationCap,
  Inbox,
  Presentation,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { KpiCard, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { dinero } from "@/lib/labels";
import { R, ROL_LABEL, tieneRol } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import {
  dashboardGeneral,
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

export default async function InicioPage({ searchParams }: { searchParams: Promise<{ denegado?: string }> }) {
  const user = await requirePage();
  const { denegado } = await searchParams;
  const nombre = user.name.split(" ")[0];

  return (
    <>
      <PageHeader title={`Hola, ${nombre}`} description={tieneRol(user.rol, R.APRENDIZ) ? "Este es tu espacio de estudio. Tus cursos están en el menú de la izquierda." : `Bienvenido a tu espacio de estudio · ${ROL_LABEL[user.rol]}`} />
      {denegado && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          No tienes permiso para entrar a esa sección.
        </p>
      )}

      {tieneRol(user.rol, R.ASISTENCIA_IGLESIA) && <TurnoSemana />}
      {tieneRol(user.rol, R.ADMIN) && <TableroGeneral />}
      {user.rol === "LIDER" && <TableroLider />}
      {user.rol === "SUPERVISOR" && <TableroSupervisor />}
      {user.rol === "MAESTRO" && <TableroMaestro />}
      <TableroEstudiante fielId={user.fielId} compacto={!tieneRol(user.rol, R.APRENDIZ)} />
    </>
  );

  async function TableroGeneral() {
    const s = await dashboardGeneral();
    return (
      <>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard icon={Users} label="Total fieles" value={s.totalFieles} color="violet" />
          <KpiCard icon={UserCheck} label="Activos" value={s.fielesActivos} color="green" />
          <KpiCard icon={BookOpen} label="Cursando" value={s.enCurso} color="blue" />
          <KpiCard icon={Award} label="Certificados" value={s.certificados} color="teal" />
          <KpiCard icon={Inbox} label="Tareas por revisar" value={s.tareasPendientes} color="amber" />
          <KpiCard icon={GraduationCap} label="Aprobados" value={s.aprobados} color="indigo" />
          <KpiCard icon={CalendarCheck} label="Asistencias hoy" value={s.asistenciasHoy} color="pink" />
          <KpiCard icon={DollarSign} label="Ingresos" value={dinero(s.ingresos)} color="slate" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Atajo href="/workspace/grupos" icon={Users} label="Grupos y líderes" />
          <Atajo href="/workspace/cronograma" icon={CalendarCheck} label="Cronograma de asistencia" />
          <Atajo href="/workspace/certificados" icon={Award} label="Certificados por firmar" />
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
        <div className="grid gap-3 md:grid-cols-3">
          <Atajo href="/workspace/fieles" icon={Users} label="Fieles" />
          <Atajo href="/workspace/asistencia" icon={CalendarCheck} label="Registrar asistencia" />
          <Atajo href="/workspace/bautismos" icon={Droplets} label="Bautismos" />
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
