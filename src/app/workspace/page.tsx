import Link from "next/link";
import {
  AlertTriangle,
  Award,
  BookOpen,
  CalendarCheck,
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
} from "@/server/dashboards";
import { TableroEstudiante } from "./tablero-estudiante";

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
      <PageHeader title={`Hola, ${nombre}`} description={user.rol === "ESTUDIANTE" ? "Este es tu espacio de estudio. Tus cursos están en el menú de la izquierda." : `Bienvenido a tu espacio de estudio · ${ROL_LABEL[user.rol]}`} />
      {denegado && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          No tienes permiso para entrar a esa sección.
        </p>
      )}

      {tieneRol(user.rol, R.ADMIN) && <TableroGeneral />}
      {user.rol === "LIDER" && <TableroLider />}
      {user.rol === "SUPERVISOR" && <TableroSupervisor />}
      {user.rol === "MAESTRO" && <TableroMaestro />}
      <TableroEstudiante fielId={user.fielId} compacto={user.rol !== "ESTUDIANTE"} />
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
          <Atajo href="/workspace/fieles" icon={Users} label="Gestionar fieles" />
          <Atajo href="/workspace/asistencia" icon={CalendarCheck} label="Registrar asistencia" />
          <Atajo href="/workspace/certificados" icon={Award} label="Ver certificados" />
        </div>
      </>
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
