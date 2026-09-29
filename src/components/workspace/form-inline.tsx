"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { toast } from "@/components/workspace/aviso";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

type Props = {
  action: (formData: FormData) => Promise<ActionResult<unknown>>;
  successMessage?: string;
  submitLabel?: string;
  children: ReactNode;
};

/** Formulario dentro de la página (sin diálogo) que llama una server action y refresca. */
export function FormInline({ action, successMessage = "Guardado", submitLabel = "Guardar cambios", children }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const res = await action(fd);
      if (!res.success) return void toast.error(res.error);
      toast.success(successMessage);
      // Limpia los campos de archivo y la casilla "quitar imagen" para no reenviarlos
      form.querySelectorAll<HTMLInputElement>('input[type="file"], input[name="quitarImagen"]').forEach((i) => {
        if (i.type === "file") i.value = "";
        else i.checked = false;
      });
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {children}
      <div className="flex justify-end border-t pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
