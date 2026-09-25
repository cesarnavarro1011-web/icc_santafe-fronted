import { GraduationCap, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Persona = { nombre: string; apellido: string };
export type EquipoCurso = {
  maestros: { rol: "TITULAR" | "AUXILIAR"; nivel: number | null; fiel: Persona }[];
  supervisores?: { fiel: Persona }[];
};

const nombre = (p: Persona) => `${p.nombre} ${p.apellido}`;

/** "María Maestra · Jorge Maestro (auxiliar, nivel 2)" */
export function textoMaestros(maestros: EquipoCurso["maestros"]) {
  return [...maestros]
    .sort((a, b) => Number(a.rol === "AUXILIAR") - Number(b.rol === "AUXILIAR"))
    .map((m) => {
      const extra = [m.rol === "AUXILIAR" ? "auxiliar" : null, m.nivel ? `nivel ${m.nivel}` : null].filter(Boolean).join(", ");
      return extra ? `${nombre(m.fiel)} (${extra})` : nombre(m.fiel);
    })
    .join(" · ");
}

/** Maestro(s) y supervisor(es) asignados a un curso. */
export function EquipoCursoInfo({ equipo, className }: { equipo: EquipoCurso; className?: string }) {
  return (
    <div className={cn("space-y-1 text-sm", className)}>
      <p className="flex items-start gap-1.5">
        <GraduationCap className="mt-0.5 size-4 shrink-0 text-violet-500" />
        <span>
          <span className="text-muted-foreground">Maestro: </span>
          {equipo.maestros.length ? textoMaestros(equipo.maestros) : <span className="text-amber-600">sin asignar</span>}
        </span>
      </p>
      {equipo.supervisores && (
        <p className="flex items-start gap-1.5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-violet-500" />
          <span>
            <span className="text-muted-foreground">Supervisor: </span>
            {equipo.supervisores.length ? equipo.supervisores.map((s) => nombre(s.fiel)).join(" · ") : <span className="text-amber-600">sin asignar</span>}
          </span>
        </p>
      )}
    </div>
  );
}
