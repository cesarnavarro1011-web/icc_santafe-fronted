"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "@/components/workspace/aviso";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { asignarMiembros } from "./actions";

type Fiel = { id: string; nombre: string; grupoActual: string | null };

export function MiembrosDialog({ grupoId, grupo, fieles, liderId }: { grupoId: string; grupo: string; fieles: Fiel[]; liderId: string | null }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inicial = useMemo(() => new Set(fieles.filter((f) => f.grupoActual === grupo).map((f) => f.id)), [fieles, grupo]);
  const [marcados, setMarcados] = useState<Set<string>>(inicial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const visibles = fieles.filter((f) => f.nombre.toLowerCase().includes(q.toLowerCase()));

  function toggle(id: string) {
    if (id === liderId) return; // el líder siempre pertenece a su grupo
    setMarcados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function guardar() {
    startTransition(async () => {
      const res = await asignarMiembros(grupoId, [...marcados]);
      if (!res.success) return void toast.error(res.error);
      toast.success(`Grupo actualizado: ${res.data} miembros`);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setMarcados(new Set(inicial));
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus /> Miembros
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Miembros de {grupo}</DialogTitle>
          <DialogDescription>Cada fiel pertenece a un solo grupo: si marcas a alguien de otro grupo, se cambia a este.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Input placeholder="Buscar fiel..." value={q} onChange={(e) => setQ(e.target.value)} />
          <span className="text-muted-foreground shrink-0 text-sm">{marcados.size} seleccionados</span>
        </div>
        <div className="grid max-h-96 gap-1 overflow-y-auto rounded-lg border p-2 sm:grid-cols-2">
          {visibles.map((f) => (
            <label key={f.id} className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm">
              <input
                type="checkbox"
                checked={marcados.has(f.id) || f.id === liderId}
                disabled={f.id === liderId}
                onChange={() => toggle(f.id)}
                className="size-4 accent-violet-600"
              />
              <span className="flex-1 truncate">
                {f.nombre}
                {f.id === liderId && <span className="text-violet-600"> · líder</span>}
              </span>
              {f.grupoActual && f.grupoActual !== grupo && <span className="text-muted-foreground truncate text-xs">en {f.grupoActual}</span>}
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={pending}>
            {pending ? "Guardando..." : "Guardar miembros"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
