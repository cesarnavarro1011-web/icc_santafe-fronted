"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Field } from "@/components/workspace/ui-kit";
import { guardarSesion } from "./actions";

type CursoConEstudiantes = {
  id: string;
  nombre: string;
  estudiantes: { fielId: string; nombre: string }[];
};

export function RegistroSesion({ cursos, hoy }: { cursos: CursoConEstudiantes[]; hoy: string }) {
  const [cursoId, setCursoId] = useState(cursos[0]?.id ?? "");
  const [nivel, setNivel] = useState(1);
  const [fecha, setFecha] = useState(hoy);
  const [tema, setTema] = useState("");
  const [presentes, setPresentes] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const curso = cursos.find((c) => c.id === cursoId);

  function toggle(id: string) {
    setPresentes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function guardar() {
    startTransition(async () => {
      const res = await guardarSesion({ cursoId, nivel, fecha, tema, fielIds: [...presentes] });
      if (!res.success) return void toast.error(res.error);
      toast.success(`Clase guardada: ${res.data} asistentes`);
      setPresentes(new Set());
      setTema("");
      router.refresh();
    });
  }

  if (cursos.length === 0) return <p className="text-muted-foreground text-sm">No tienes cursos asignados.</p>;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Curso" className="sm:col-span-2">
          <NativeSelect
            value={cursoId}
            onChange={(e) => {
              setCursoId(e.target.value);
              setPresentes(new Set());
            }}
          >
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Nivel">
          <Input type="number" min={1} value={nivel} onChange={(e) => setNivel(Number(e.target.value) || 1)} />
        </Field>
        <Field label="Fecha">
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Field>
        <Field label="Tema (opcional)" className="sm:col-span-4">
          <Input value={tema} onChange={(e) => setTema(e.target.value)} />
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setPresentes(new Set(curso?.estudiantes.map((e) => e.fielId)))}>
          Marcar todos
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setPresentes(new Set())}>
          Limpiar
        </Button>
        <span className="text-muted-foreground ml-auto text-sm">
          {presentes.size} de {curso?.estudiantes.length ?? 0} presentes
        </span>
      </div>
      <div className="grid max-h-72 gap-1 overflow-y-auto rounded-lg border p-2 sm:grid-cols-2 lg:grid-cols-3">
        {curso?.estudiantes.map((e) => (
          <label key={e.fielId} className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm">
            <input type="checkbox" checked={presentes.has(e.fielId)} onChange={() => toggle(e.fielId)} className="size-4 accent-violet-600" />
            {e.nombre}
          </label>
        ))}
        {curso && curso.estudiantes.length === 0 && <p className="text-muted-foreground p-2 text-sm">Este curso no tiene estudiantes.</p>}
      </div>
      <p className="text-muted-foreground text-xs">Si ya existe una clase en ese curso, nivel y fecha, se reemplaza su lista de asistentes.</p>
      <div className="flex justify-end">
        <Button onClick={guardar} disabled={pending || !cursoId}>
          {pending ? "Guardando..." : "Guardar clase"}
        </Button>
      </div>
    </div>
  );
}
