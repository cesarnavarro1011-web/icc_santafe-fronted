"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { FormDialog } from "@/components/workspace/form-dialog";
import { Field } from "@/components/workspace/ui-kit";
import { crearAcceso, restablecerPassword } from "./actions";

type Credencial = { usuario: string; temporal: string };
type Opcion = { value: string; label: string };

function MostrarCredencial({ cred, onClose }: { cred: Credencial | null; onClose: () => void }) {
  return (
    <Dialog open={!!cred} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contraseña temporal</DialogTitle>
          <DialogDescription>Entrégala a la persona. Deberá cambiarla la primera vez que entre. No se volverá a mostrar.</DialogDescription>
        </DialogHeader>
        {cred && (
          <div className="bg-muted space-y-1 rounded-lg p-4 font-mono text-sm">
            <div>
              Usuario: <strong>{cred.usuario}</strong>
            </div>
            <div>
              Contraseña: <strong className="text-lg tracking-wider">{cred.temporal}</strong>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              if (!cred) return;
              navigator.clipboard?.writeText(`Usuario: ${cred.usuario}\nContraseña temporal: ${cred.temporal}`);
              toast.success("Copiado");
            }}
          >
            <Copy /> Copiar
          </Button>
          <Button onClick={onClose}>Listo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CrearAccesoDialog({ fieles, roles }: { fieles: Opcion[]; roles: Opcion[] }) {
  const [cred, setCred] = useState<Credencial | null>(null);
  return (
    <>
      <FormDialog
        title="Crear acceso al sistema"
        description="El fiel debe existir en Fieles. Se genera una contraseña temporal."
        action={crearAcceso}
        successMessage="Acceso creado"
        onSuccess={(d) => setCred(d as Credencial)}
        trigger={
          <Button>
            <Plus /> Crear acceso
          </Button>
        }
      >
        <Field label="Fiel *">
          <NativeSelect name="fielId" required defaultValue="">
            <option value="" disabled>
              {fieles.length ? "Selecciona..." : "Todos los fieles activos ya tienen acceso"}
            </option>
            {fieles.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Usuario *">
            <Input name="usuario" placeholder="nombre.apellido" required />
          </Field>
          <Field label="Rol">
            <NativeSelect name="rol" defaultValue="ESTUDIANTE">
              {roles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <p className="text-muted-foreground text-xs">La persona también podrá entrar con su ID de fiel o su correo.</p>
      </FormDialog>
      <MostrarCredencial cred={cred} onClose={() => setCred(null)} />
    </>
  );
}

export function RestablecerButton({ usuarioId, nombre }: { usuarioId: string; nombre: string }) {
  const [cred, setCred] = useState<Credencial | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <>
      <Button
        size="icon-sm"
        variant="outline"
        aria-label="Restablecer contraseña"
        title="Restablecer contraseña"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`¿Generar una contraseña temporal nueva para ${nombre}?`)) return;
          startTransition(async () => {
            const res = await restablecerPassword(usuarioId);
            if (!res.success) return void toast.error(res.error);
            setCred(res.data);
            router.refresh();
          });
        }}
      >
        <KeyRound />
      </Button>
      <MostrarCredencial cred={cred} onClose={() => setCred(null)} />
    </>
  );
}
