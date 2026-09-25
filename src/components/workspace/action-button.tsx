"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { confirmar, toast } from "@/components/workspace/aviso";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

type Props = {
  action: () => Promise<ActionResult<unknown>>;
  children: ReactNode;
  confirm?: string;
  successMessage?: string;
} & Omit<React.ComponentProps<typeof Button>, "onClick" | "children">;

// Confirmaciones de acciones destructivas: botón rojo en el modal
const ACCION_PELIGROSA = /eliminar|quitar|anular|desactivar|borrar/i;

/** Botón que ejecuta una server action (con confirmación opcional en modal). */
export function ActionButton({ action, children, confirm, successMessage = "Listo", ...props }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      {...props}
      disabled={pending || props.disabled}
      onClick={async () => {
        if (confirm && !(await confirmar(confirm, { peligro: ACCION_PELIGROSA.test(confirm) }))) return;
        startTransition(async () => {
          const res = await action();
          if (!res.success) return void toast.error(res.error);
          toast.success(successMessage);
          router.refresh();
        });
      }}
    >
      {children}
    </Button>
  );
}
