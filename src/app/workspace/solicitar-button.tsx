"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Clock, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { solicitarInscripcion } from "./actions";

export function SolicitarButton({ cursoId, nombre, solicitado, gratis }: { cursoId: string; nombre: string; solicitado: boolean; gratis: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (solicitado) {
    return (
      <Button variant="outline" className="w-full" disabled>
        <Clock /> Solicitud en proceso
      </Button>
    );
  }

  return (
    <Button
      className="w-full"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`¿Quieres inscribirte en "${nombre}"? El pastor recibirá tu solicitud${gratis ? "" : " para coordinar el pago"}.`)) return;
        startTransition(async () => {
          const res = await solicitarInscripcion(cursoId);
          if (!res.success) return void toast.error(res.error);
          toast.success("¡Solicitud enviada! Te avisaremos cuando quedes inscrito.");
          router.refresh();
        });
      }}
    >
      <ShoppingCart /> {pending ? "Enviando..." : gratis ? "Quiero inscribirme" : "Quiero este curso"}
    </Button>
  );
}
