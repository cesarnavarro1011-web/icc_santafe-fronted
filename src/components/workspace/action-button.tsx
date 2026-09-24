"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

type Props = {
  action: () => Promise<ActionResult<unknown>>;
  children: ReactNode;
  confirm?: string;
  successMessage?: string;
} & Omit<React.ComponentProps<typeof Button>, "onClick" | "children">;

/** Botón que ejecuta una server action (con confirmación opcional). */
export function ActionButton({ action, children, confirm, successMessage = "Listo", ...props }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      {...props}
      disabled={pending || props.disabled}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
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
