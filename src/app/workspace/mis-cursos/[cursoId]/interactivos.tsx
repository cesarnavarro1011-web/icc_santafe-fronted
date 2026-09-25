"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "@/components/workspace/aviso";
import { FileUp, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { presentarExamen, subirTarea } from "../actions";

export function SubirTarea({ actividadId }: { actividadId: string }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await subirTarea(actividadId, fd);
      if (!res.success) return void toast.error(res.error);
      toast.success("Tarea enviada. Tu maestro la revisará pronto.");
      setArchivo(null);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      <label className="hover:border-violet-400 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition">
        <FileUp className="text-muted-foreground size-9" />
        <span className="text-muted-foreground text-sm">{archivo ? archivo.name : "Haz clic para seleccionar tu PDF (máx. 10 MB)"}</span>
        {archivo && <span className="text-muted-foreground text-xs">{(archivo.size / 1024 / 1024).toFixed(2)} MB</span>}
        <Input name="archivo" type="file" accept="application/pdf" className="hidden" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
      </label>
      <div className="flex justify-end">
        <Button type="submit" disabled={!archivo || pending}>
          <Send /> {pending ? "Enviando..." : "Enviar tarea"}
        </Button>
      </div>
    </form>
  );
}

type Pregunta = { id: string; pregunta: string; puntos: number };
type Resultado = { nota: number; obtenidos: number; total: number; aprobado: boolean };

export function Examen({ actividadId, preguntas, notaMinima }: { actividadId: string; preguntas: Pregunta[]; notaMinima: number }) {
  const [iniciado, setIniciado] = useState(false);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (preguntas.length === 0) return <p className="text-muted-foreground text-sm">Este examen aún no tiene preguntas.</p>;

  if (resultado) {
    return (
      <div className="py-6 text-center">
        <div className="mb-2 text-5xl">{resultado.aprobado ? "🎉" : "😔"}</div>
        <div className={resultado.aprobado ? "text-5xl font-bold text-emerald-600" : "text-5xl font-bold text-red-500"}>
          {resultado.nota}
          <span className="text-muted-foreground text-2xl font-normal">/10</span>
        </div>
        <p className="mt-1 font-semibold">{resultado.aprobado ? "¡Aprobaste!" : "Esta vez no alcanzó"}</p>
        <p className="text-muted-foreground text-sm">
          {resultado.obtenidos} de {resultado.total} puntos
        </p>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => {
            setResultado(null);
            setIniciado(false);
            setRespuestas({});
          }}
        >
          {resultado.aprobado ? "Cerrar" : "Intentar de nuevo"}
        </Button>
      </div>
    );
  }

  if (!iniciado) {
    return (
      <Button className="w-full py-6 text-base" onClick={() => setIniciado(true)}>
        Comenzar examen ({preguntas.length} preguntas)
      </Button>
    );
  }

  function enviar() {
    if (preguntas.some((p) => !(respuestas[p.id] ?? "").trim())) return void toast.warning("Responde todas las preguntas antes de enviar.");
    startTransition(async () => {
      const res = await presentarExamen(actividadId, respuestas);
      if (!res.success) return void toast.error(res.error);
      setResultado(res.data);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        {preguntas.length} preguntas · Responde todas · Nota mínima: {notaMinima}/10
      </p>
      {preguntas.map((p, i) => (
        <div key={p.id} className="rounded-lg border p-4">
          <p className="mb-2 font-medium">
            {i + 1}. {p.pregunta}
          </p>
          <Input
            placeholder="Tu respuesta..."
            value={respuestas[p.id] ?? ""}
            onChange={(e) => setRespuestas((r) => ({ ...r, [p.id]: e.target.value }))}
          />
          <p className="text-muted-foreground mt-1 text-xs">
            {p.puntos} punto{p.puntos !== 1 ? "s" : ""}
          </p>
        </div>
      ))}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setIniciado(false)}>
          Cancelar
        </Button>
        <Button onClick={enviar} disabled={pending}>
          <Send /> {pending ? "Calificando..." : "Enviar examen"}
        </Button>
      </div>
    </div>
  );
}
