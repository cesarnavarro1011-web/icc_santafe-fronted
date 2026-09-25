"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "@/components/workspace/aviso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/workspace/ui-kit";
import { cambiarPassword } from "./actions";

/** Cambio de contraseña (se reutiliza en el cambio obligatorio de contraseña temporal). */
export function PasswordForm({ redirigirA }: { redirigirA?: string }) {
  const [pending, startTransition] = useTransition();
  const { update } = useSession();
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const res = await cambiarPassword(fd);
      if (!res.success) return void toast.error(res.error);
      toast.success("Contraseña actualizada", { description: "La próxima vez inicia sesión con tu nueva contraseña." });
      form.reset();
      await update(); // refresca el token (quita la marca de contraseña temporal)
      if (redirigirA) {
        router.push(redirigirA);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label="Contraseña actual">
        <Input name="actual" type="password" autoComplete="current-password" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nueva contraseña">
          <Input name="nueva" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <Field label="Confirmar nueva contraseña">
          <Input name="confirmar" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
      </div>
      <p className="text-muted-foreground text-xs">Mínimo 8 caracteres, con letras y números.</p>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : "Cambiar contraseña"}
        </Button>
      </div>
    </form>
  );
}
