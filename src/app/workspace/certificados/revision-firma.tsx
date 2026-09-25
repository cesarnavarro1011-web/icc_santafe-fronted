import Link from "next/link";
import { AlertTriangle, Check, Hourglass, Signature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ActionButton } from "@/components/workspace/action-button";
import { ACADEMICO } from "@/lib/config";
import { fecha } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { firmar } from "./actions";

export type DatosRevision = {
  id: string;
  codigo: string;
  estudiante: string;
  curso: string;
  notaFinal: number | null;
  progreso: number | null;
  asistencia: { porcentaje: number; asistidas: number; total: number };
  firmas: { rol: string; nombre: string | null; at: Date | null }[];
};

function Dato({ label, valor, ok }: { label: string; valor: string; ok: boolean }) {
  return (
    <div className={cn("rounded-lg border p-3", ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50")}>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={cn("text-lg font-bold tabular-nums", ok ? "text-emerald-700" : "text-red-600")}>{valor}</p>
    </div>
  );
}

/** Ficha de un certificado: se revisa y se firma de uno en uno. */
export function RevisionFirma({ c, como, tieneFirma }: { c: DatosRevision; como: "SUPERVISOR" | "PASTOR"; tieneFirma: boolean }) {
  const notaOk = (c.notaFinal ?? 0) >= ACADEMICO.NOTA_MIN_APROBAR;
  const asistOk = c.asistencia.total === 0 || c.asistencia.porcentaje >= ACADEMICO.ASISTENCIA_MIN_PCT;
  const progresoOk = (c.progreso ?? 0) >= 100;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">
          <Signature /> {como === "PASTOR" ? "Revisar y emitir" : "Revisar y firmar"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{c.estudiante}</DialogTitle>
          <DialogDescription>
            {c.curso} · Certificado {c.codigo}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          <Dato label="Nota final" valor={c.notaFinal !== null ? `${c.notaFinal}/10` : "—"} ok={notaOk} />
          <Dato label="Progreso" valor={c.progreso !== null ? `${c.progreso}%` : "—"} ok={progresoOk} />
          <Dato label="Asistencia" valor={c.asistencia.total ? `${c.asistencia.porcentaje}%` : "—"} ok={asistOk} />
        </div>
        <p className="text-muted-foreground -mt-2 text-xs">
          {c.asistencia.asistidas} de {c.asistencia.total} clases · mínimos: nota {ACADEMICO.NOTA_MIN_APROBAR}, asistencia {ACADEMICO.ASISTENCIA_MIN_PCT}%
        </p>

        <div className="rounded-lg border">
          <p className="text-muted-foreground border-b px-3 py-2 text-xs font-medium uppercase">Firmas</p>
          <ul className="divide-y text-sm">
            {c.firmas.map((f) => (
              <li key={f.rol} className="flex items-center gap-2 px-3 py-2">
                <span className={cn("flex size-5 items-center justify-center rounded-full", f.at ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground")}>
                  {f.at ? <Check className="size-3" /> : <Hourglass className="size-3" />}
                </span>
                <span className="w-24 font-medium">{f.rol}</span>
                <span className="text-muted-foreground flex-1 truncate text-xs">{f.at ? `${f.nombre ?? "—"} · ${fecha(f.at)}` : "Pendiente"}</span>
              </li>
            ))}
          </ul>
        </div>

        {(!notaOk || !asistOk || !progresoOk) && (
          <p className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="size-4 shrink-0" /> Este estudiante no cumple todos los requisitos. Revisa antes de firmar.
          </p>
        )}
        {!tieneFirma && (
          <p className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="size-4 shrink-0" />
            <span>
              No tienes firma digital: el diploma saldrá sin tu firma. Súbela en{" "}
              <Link href="/workspace/perfil" className="font-semibold underline">
                Perfil y seguridad
              </Link>
              .
            </span>
          </p>
        )}

        <div className="flex justify-end gap-2 border-t pt-4">
          <ActionButton
            confirm={
              como === "PASTOR"
                ? `¿Firmar el certificado de ${c.estudiante}? Se generará el diploma PDF y se le enviará por correo.`
                : `¿Firmar el certificado de ${c.estudiante} como supervisor?`
            }
            successMessage={como === "PASTOR" ? "Certificado emitido" : "Firmado. Pasa al pastor."}
            action={firmar.bind(null, c.id, como)}
          >
            <Signature /> {como === "PASTOR" ? "Firmar y emitir" : "Firmar"}
          </ActionButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
