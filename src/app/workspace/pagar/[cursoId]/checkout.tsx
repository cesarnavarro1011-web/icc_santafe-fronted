"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BadgePercent, Lock, X } from "lucide-react";
import { toast } from "@/components/workspace/aviso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cotizarCurso, pagarCurso } from "../../pagos/actions";

const pesos = (v: number) => v.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

type Precio = { costo: number; descuento: number; total: number; codigo: string | null; descripcion: string | null };

export function Checkout({ cursoId, costo, simulado }: { cursoId: string; costo: number; simulado: boolean }) {
  const [precio, setPrecio] = useState<Precio>({ costo, descuento: 0, total: costo, codigo: null, descripcion: null });
  const [codigo, setCodigo] = useState("");
  const [aplicando, startAplicar] = useTransition();
  const [pagando, startPagar] = useTransition();
  const router = useRouter();

  function aplicar() {
    if (!codigo.trim()) return;
    startAplicar(async () => {
      const r = await cotizarCurso(cursoId, codigo);
      if (!r.success) return void toast.error(r.error);
      setPrecio(r.data);
      toast.success(`Código aplicado: -${pesos(r.data.descuento)}`);
    });
  }

  function quitar() {
    setPrecio({ costo, descuento: 0, total: costo, codigo: null, descripcion: null });
    setCodigo("");
  }

  function pagar() {
    startPagar(async () => {
      const r = await pagarCurso(cursoId, precio.codigo);
      if (!r.success) return void toast.error(r.error);
      if (r.data.tipo === "gratis") {
        toast.success("¡Listo! Ya tienes acceso al curso.");
        router.push(`/workspace/mis-cursos/${r.data.cursoId}`);
        router.refresh();
        return;
      }
      window.location.href = r.data.url; // Mercado Pago (o la simulación local)
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Valor del curso</span>
          <span className="tabular-nums">{pesos(precio.costo)}</span>
        </div>
        {precio.descuento > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span className="flex items-center gap-1">
              <BadgePercent className="size-4" /> Código {precio.codigo}
              <button onClick={quitar} aria-label="Quitar código" className="text-muted-foreground hover:text-foreground">
                <X className="size-3.5" />
              </button>
            </span>
            <span className="tabular-nums">-{pesos(precio.descuento)}</span>
          </div>
        )}
        <div className="flex justify-between border-t pt-2 text-lg font-bold">
          <span>Total a pagar</span>
          <span className="tabular-nums">{pesos(precio.total)}</span>
        </div>
        {precio.descripcion && <p className="text-muted-foreground text-xs">{precio.descripcion}</p>}
      </div>

      {!precio.codigo && (
        <div className="flex gap-2">
          <Input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), aplicar())}
            placeholder="¿Tienes un código de promoción?"
            maxLength={30}
          />
          <Button variant="outline" onClick={aplicar} disabled={aplicando || !codigo.trim()}>
            {aplicando ? "…" : "Aplicar"}
          </Button>
        </div>
      )}

      <Button className="w-full bg-[#009ee3] py-6 text-base hover:bg-[#0087c2]" onClick={pagar} disabled={pagando}>
        {pagando ? "Conectando…" : precio.total <= 0 ? "Obtener acceso gratis" : `Pagar ${pesos(precio.total)} con Mercado Pago`}
      </Button>
      <p className="text-muted-foreground flex items-center justify-center gap-1 text-center text-xs">
        <Lock className="size-3" />
        {precio.total <= 0
          ? "El código cubre todo el valor: quedarás inscrito de inmediato."
          : "Pagas en la página segura de Mercado Pago: tarjeta, PSE, Nequi, Efecty y más. Al aprobarse, quedas inscrito automáticamente."}
      </p>
      {simulado && precio.total > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Modo desarrollo: Mercado Pago no está configurado, el pago se simulará.
        </p>
      )}
    </div>
  );
}
