"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { FlaskConical } from "lucide-react";
import { toast } from "@/components/workspace/aviso";
import { Button } from "@/components/ui/button";
import { probarComunicado } from "../actions";

/** Envía el comunicado solo a quien lo prepara y muestra a dónde llegó. */
export function BotonPrueba({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await probarComunicado(id);
          if (!res.success) return void toast.error(res.error);
          toast.success("Prueba enviada", { description: res.data });
        })
      }
    >
      <FlaskConical /> {pending ? "Enviando prueba…" : "Enviarme una prueba"}
    </Button>
  );
}

/** Mientras el comunicado se envía, refresca la página cada 3 s para ver el avance. */
export function AutoRefresco({ activo }: { activo: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!activo) return;
    const t = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(t);
  }, [activo, router]);
  return null;
}
