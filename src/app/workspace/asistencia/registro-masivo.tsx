"use client";

import type { TipoServicio } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Field } from "@/components/workspace/ui-kit";
import { registrarAsistenciaMasiva } from "./actions";

type Props = {
  fieles: { value: string; label: string }[];
  servicios: { value: string; label: string }[];
  hoy: string;
};

export function RegistroMasivo({ fieles, servicios, hoy }: Props) {
  const [q, setQ] = useState("");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [servicio, setServicio] = useState(servicios[0]?.value ?? "DOMINGO");
  const [fecha, setFecha] = useState(hoy);
  const [invitados, setInvitados] = useState(0);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const visibles = useMemo(
    () => fieles.filter((f) => f.label.toLowerCase().includes(q.toLowerCase())),
    [fieles, q],
  );

  function toggle(id: string) {
    setMarcados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function guardar() {
    startTransition(async () => {
      const res = await registrarAsistenciaMasiva([...marcados], servicio as TipoServicio, fecha, invitados);
      if (!res.success) return void toast.error(res.error);
      toast.success(`${res.data} asistencias registradas`);
      setMarcados(new Set());
      setInvitados(0);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Servicio">
          <NativeSelect value={servicio} onChange={(e) => setServicio(e.target.value)}>
            {servicios.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Fecha">
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Field>
        <Field label="Invitados (sin registro)">
          <Input type="number" min={0} value={invitados} onChange={(e) => setInvitados(Number(e.target.value) || 0)} />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Filtrar fieles..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Button type="button" variant="outline" size="sm" onClick={() => setMarcados(new Set(visibles.map((f) => f.value)))}>
          Marcar visibles
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setMarcados(new Set())}>
          Limpiar
        </Button>
        <span className="text-muted-foreground ml-auto text-sm">{marcados.size} seleccionados</span>
      </div>
      <div className="grid max-h-80 gap-1 overflow-y-auto rounded-lg border p-2 sm:grid-cols-2 lg:grid-cols-3">
        {visibles.map((f) => (
          <label key={f.value} className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm">
            <input type="checkbox" checked={marcados.has(f.value)} onChange={() => toggle(f.value)} className="size-4 accent-violet-600" />
            <span className="truncate">{f.label}</span>
          </label>
        ))}
        {visibles.length === 0 && <p className="text-muted-foreground p-2 text-sm">Sin resultados.</p>}
      </div>
      <div className="flex justify-end">
        <Button onClick={guardar} disabled={pending}>
          {pending ? "Guardando..." : "Registrar asistencia"}
        </Button>
      </div>
    </div>
  );
}
