"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "@/components/workspace/aviso";
import { Button } from "@/components/ui/button";
import { simularPago } from "../actions";

export function VerificarDeNuevo() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" disabled={pending} onClick={() => start(() => router.refresh())}>
      <RefreshCw className={pending ? "animate-spin" : ""} /> Verificar de nuevo
    </Button>
  );
}

/** Solo en desarrollo sin credenciales de Mercado Pago. */
export function SimularPago({ inscripcionId }: { inscripcionId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await simularPago(inscripcionId);
          if (!r.success) return void toast.error(r.error);
          toast.success("Pago simulado como aprobado");
          router.refresh();
        })
      }
    >
      Simular pago aprobado (solo desarrollo)
    </Button>
  );
}
