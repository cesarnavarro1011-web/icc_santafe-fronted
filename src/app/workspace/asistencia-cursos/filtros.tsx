"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";

type Props = {
  cursos: { value: string; label: string }[];
  curso: string;
  niveles: number[];
  nivel: number;
  mes: string; // "2026-09"
  mesLabel: string;
};

function moverMes(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function FiltrosAsistencia({ cursos, curso, niveles, nivel, mes, mesLabel }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function ir(cambios: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    Object.entries(cambios).forEach(([k, v]) => next.set(k, v));
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="bg-card flex flex-wrap items-center gap-3 rounded-xl border p-3 shadow-sm">
      <NativeSelect className="w-auto min-w-56" value={curso} onChange={(e) => ir({ curso: e.target.value, nivel: "1" })}>
        {cursos.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect className="w-auto" value={String(nivel)} onChange={(e) => ir({ nivel: e.target.value })}>
        {niveles.map((n) => (
          <option key={n} value={n}>
            Nivel {n}
          </option>
        ))}
      </NativeSelect>
      <div className="ml-auto flex items-center gap-1">
        <Button variant="outline" size="icon-sm" aria-label="Mes anterior" onClick={() => ir({ mes: moverMes(mes, -1) })}>
          <ChevronLeft />
        </Button>
        <span className="min-w-36 text-center text-sm font-medium capitalize">{mesLabel}</span>
        <Button variant="outline" size="icon-sm" aria-label="Mes siguiente" onClick={() => ir({ mes: moverMes(mes, 1) })}>
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
