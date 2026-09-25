"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarPlus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { guardarAsistenciaTabla } from "./actions";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

type Props = {
  cursoId: string;
  nivel: number;
  /** Fechas "yyyy-mm-dd" a mostrar como columnas; `programada` = sale del horario del curso */
  fechas: { iso: string; programada: boolean }[];
  estudiantes: { fielId: string; nombre: string }[];
  /** Asistencias ya guardadas como "fecha|fielId" */
  marcadas: string[];
  hoy: string;
  soloLectura: boolean;
  /** Límites para agregar una clase extra (el mes mostrado, hasta hoy) */
  min: string;
  max: string;
};

export function TablaAsistencia({ cursoId, nivel, fechas, estudiantes, marcadas, hoy, soloLectura, min, max }: Props) {
  const [marcas, setMarcas] = useState(() => new Set(marcadas));
  const [extras, setExtras] = useState<string[]>([]);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [cambiadas, setCambiadas] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const columnas = useMemo(() => {
    const todas = new Map(fechas.map((f) => [f.iso, f.programada]));
    extras.forEach((e) => todas.has(e) || todas.set(e, false));
    return [...todas.entries()].map(([iso, programada]) => ({ iso, programada })).sort((a, b) => a.iso.localeCompare(b.iso));
  }, [fechas, extras]);

  const editable = (iso: string) => !soloLectura && iso <= hoy;
  const k = (iso: string, fielId: string) => `${iso}|${fielId}`;
  const asistentes = (iso: string) => estudiantes.filter((e) => marcas.has(k(iso, e.fielId))).length;
  // Una clase cuenta como dictada si ya pasó y tiene al menos un asistente
  const dictadas = columnas.filter((c) => c.iso <= hoy && asistentes(c.iso) > 0);

  function marcar(iso: string, fielIds: string[], valor: boolean) {
    setMarcas((prev) => {
      const next = new Set(prev);
      fielIds.forEach((id) => (valor ? next.add(k(iso, id)) : next.delete(k(iso, id))));
      return next;
    });
    setCambiadas((prev) => new Set(prev).add(iso));
  }

  function guardar() {
    const cambios = [...cambiadas].map((fecha) => ({
      fecha,
      fielIds: estudiantes.filter((e) => marcas.has(k(fecha, e.fielId))).map((e) => e.fielId),
    }));
    startTransition(async () => {
      const res = await guardarAsistenciaTabla(cursoId, nivel, cambios);
      if (!res.success) return void toast.error(res.error);
      toast.success(`Asistencia guardada (${res.data} ${res.data === 1 ? "fecha" : "fechas"})`);
      setCambiadas(new Set());
      router.refresh();
    });
  }

  if (estudiantes.length === 0) return <p className="text-muted-foreground p-4 text-sm">Este curso no tiene alumnos inscritos.</p>;

  return (
    <div className="space-y-3">
      {!soloLectura && (
        <div className="flex flex-wrap items-center gap-2">
          <Input type="date" value={nuevaFecha} min={min} max={max} onChange={(e) => setNuevaFecha(e.target.value)} className="w-auto" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!nuevaFecha}
            onClick={() => {
              setExtras((x) => [...x, nuevaFecha]);
              setNuevaFecha("");
            }}
          >
            <CalendarPlus /> Agregar clase extra
          </Button>
          <span className="text-muted-foreground ml-auto text-xs">
            {cambiadas.size ? `${cambiadas.size} ${cambiadas.size === 1 ? "fecha modificada" : "fechas modificadas"} sin guardar` : "Sin cambios pendientes"}
          </span>
          <Button onClick={guardar} disabled={pending || cambiadas.size === 0}>
            <Save /> {pending ? "Guardando..." : "Guardar asistencia"}
          </Button>
        </div>
      )}

      {columnas.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          No hay fechas de clase este mes. Define el horario del curso{soloLectura ? "" : " o agrega una clase extra"}.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="bg-muted/50 sticky left-0 z-10 min-w-48 border-b px-3 py-2 text-left text-xs font-medium uppercase">Alumno</th>
                {columnas.map((c) => {
                  const d = new Date(`${c.iso}T00:00:00Z`);
                  const futura = c.iso > hoy;
                  const todos = estudiantes.every((e) => marcas.has(k(c.iso, e.fielId)));
                  return (
                    <th key={c.iso} className={cn("min-w-16 border-b border-l px-1 py-1.5 text-center", futura && "opacity-50", c.iso === hoy && "bg-violet-100")}>
                      <div className="text-muted-foreground text-[10px] uppercase">{DIAS[d.getUTCDay()]}</div>
                      <div className="font-semibold tabular-nums">{d.getUTCDate()}</div>
                      {!c.programada && <div className="text-[9px] text-amber-600">extra</div>}
                      {editable(c.iso) && (
                        <input
                          type="checkbox"
                          title="Marcar a todos"
                          checked={todos}
                          onChange={() => marcar(c.iso, estudiantes.map((e) => e.fielId), !todos)}
                          className="mt-1 size-3.5 accent-violet-600"
                        />
                      )}
                    </th>
                  );
                })}
                <th className="border-b border-l px-3 py-2 text-right text-xs font-medium uppercase">Asistencia</th>
              </tr>
            </thead>
            <tbody>
              {estudiantes.map((e) => {
                const asistio = dictadas.filter((c) => marcas.has(k(c.iso, e.fielId))).length;
                const pct = dictadas.length ? Math.round((asistio / dictadas.length) * 100) : null;
                return (
                  <tr key={e.fielId} className="hover:bg-muted/30">
                    <td className="bg-background sticky left-0 z-10 border-b px-3 py-2 font-medium whitespace-nowrap">{e.nombre}</td>
                    {columnas.map((c) => (
                      <td key={c.iso} className={cn("border-b border-l text-center", c.iso === hoy && "bg-violet-50")}>
                        <input
                          type="checkbox"
                          aria-label={`${e.nombre} ${c.iso}`}
                          checked={marcas.has(k(c.iso, e.fielId))}
                          disabled={!editable(c.iso)}
                          onChange={(ev) => marcar(c.iso, [e.fielId], ev.target.checked)}
                          className="size-4 accent-emerald-600 disabled:opacity-40"
                        />
                      </td>
                    ))}
                    <td className="border-b border-l px-3 py-2 text-right text-xs whitespace-nowrap tabular-nums">
                      {pct === null ? (
                        "—"
                      ) : (
                        <span className={pct >= 75 ? "text-emerald-700" : "font-semibold text-red-600"}>
                          {pct}% <span className="text-muted-foreground font-normal">({asistio}/{dictadas.length})</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 text-xs">
                <td className="bg-muted/30 sticky left-0 z-10 px-3 py-2 font-medium">Asistentes</td>
                {columnas.map((c) => (
                  <td key={c.iso} className="border-l text-center font-semibold tabular-nums">
                    {c.iso <= hoy ? asistentes(c.iso) : ""}
                  </td>
                ))}
                <td className="border-l" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="text-muted-foreground text-xs">
        Las fechas futuras se habilitan el día de la clase. Una fecha sin ningún alumno marcado no cuenta como clase dictada. Mínimo 75% de asistencia para certificarse.
      </p>
    </div>
  );
}
