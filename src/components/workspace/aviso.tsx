"use client";

import { useEffect, useReducer } from "react";
import { AlertTriangle, CheckCircle2, CircleX, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ============================================================
//  Avisos y confirmaciones en modal (reemplazan toasts y window.confirm).
//  Uso:  toast.success("Guardado")   ·   if (await confirmar("¿Eliminar?")) …
//  Requiere <AvisoHost /> montado una vez (layout del workspace y login).
// ============================================================

type Tipo = "success" | "error" | "warning" | "info";
type Aviso = { id: number; tipo: Tipo; titulo: string; descripcion?: string };
type Confirmacion = { mensaje: string; titulo?: string; textoConfirmar?: string; peligro?: boolean; resolver: (ok: boolean) => void };

let cola: Aviso[] = [];
let confirmacion: Confirmacion | null = null;
let siguienteId = 0;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((o) => o());

function mostrar(tipo: Tipo, titulo: string, opts?: { description?: string }) {
  cola = [...cola, { id: ++siguienteId, tipo, titulo, descripcion: opts?.description }];
  avisar();
}

/** Misma forma que `toast` de sonner, pero se muestra como modal. */
export const toast = {
  success: (titulo: string, opts?: { description?: string }) => mostrar("success", titulo, opts),
  error: (titulo: string, opts?: { description?: string }) => mostrar("error", titulo, opts),
  warning: (titulo: string, opts?: { description?: string }) => mostrar("warning", titulo, opts),
  info: (titulo: string, opts?: { description?: string }) => mostrar("info", titulo, opts),
};

/** Confirmación en modal. Resuelve true si el usuario acepta. */
export function confirmar(mensaje: string, opts: Omit<Confirmacion, "mensaje" | "resolver"> = {}) {
  return new Promise<boolean>((resolver) => {
    confirmacion?.resolver(false);
    confirmacion = { mensaje, ...opts, resolver };
    avisar();
  });
}

const ESTILO: Record<Tipo, { icono: typeof Info; color: string; titulo: string }> = {
  success: { icono: CheckCircle2, color: "bg-emerald-50 text-emerald-600", titulo: "Listo" },
  error: { icono: CircleX, color: "bg-red-50 text-red-600", titulo: "No se pudo completar" },
  warning: { icono: AlertTriangle, color: "bg-amber-50 text-amber-600", titulo: "Atención" },
  info: { icono: Info, color: "bg-blue-50 text-blue-600", titulo: "Información" },
};

export function AvisoHost() {
  const [, refrescar] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    oyentes.add(refrescar);
    return () => void oyentes.delete(refrescar);
  }, []);

  const actual = cola[0];
  const cerrar = () => {
    cola = cola.slice(1);
    avisar();
  };

  // Los avisos de éxito se cierran solos; los errores esperan a que el usuario los lea
  useEffect(() => {
    if (actual?.tipo !== "success") return;
    const t = setTimeout(cerrar, 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actual?.id]);

  const responder = (ok: boolean) => {
    confirmacion?.resolver(ok);
    confirmacion = null;
    avisar();
  };

  const estilo = actual ? ESTILO[actual.tipo] : null;
  return (
    <>
      <Dialog open={!!actual} onOpenChange={(o) => !o && cerrar()}>
        {actual && estilo && (
          <DialogContent className="sm:max-w-sm">
            <DialogHeader className="items-center text-center sm:text-center">
              <span className={cn("mb-1 flex size-12 items-center justify-center rounded-full", estilo.color)}>
                <estilo.icono className="size-6" />
              </span>
              <DialogTitle className="text-center leading-snug">{actual.titulo}</DialogTitle>
              <DialogDescription className="text-center">{actual.descripcion ?? (actual.tipo === "success" ? "" : estilo.titulo)}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-center">
              <Button onClick={cerrar} className="min-w-32" autoFocus>
                Entendido
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={!!confirmacion} onOpenChange={(o) => !o && responder(false)}>
        {confirmacion && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{confirmacion.titulo ?? "Confirmar"}</DialogTitle>
              <DialogDescription className="text-foreground/80 text-sm leading-relaxed">{confirmacion.mensaje}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => responder(false)}>
                Cancelar
              </Button>
              <Button variant={confirmacion.peligro ? "destructive" : "default"} onClick={() => responder(true)} autoFocus>
                {confirmacion.textoConfirmar ?? "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
