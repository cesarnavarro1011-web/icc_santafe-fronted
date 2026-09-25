"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "@/components/workspace/aviso";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";

type Props = {
  trigger: ReactNode;
  title: string;
  description?: string;
  action: (formData: FormData) => Promise<ActionResult<unknown>>;
  successMessage?: string;
  submitLabel?: string;
  children: ReactNode;
  className?: string;
  onSuccess?: (data: unknown) => void;
};

/** Diálogo con formulario que llama una server action, muestra toast y refresca la página. */
export function FormDialog({
  trigger,
  title,
  description,
  action,
  successMessage = "Guardado",
  submitLabel = "Guardar",
  children,
  className,
  onSuccess,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await action(fd);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(successMessage);
      setOpen(false);
      onSuccess?.(res.data);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className={cn("sm:max-w-xl", className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          {children}
          <DialogFooter className="border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
