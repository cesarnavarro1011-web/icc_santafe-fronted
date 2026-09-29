"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { confirmar, toast } from "@/components/workspace/aviso";
import { Clock, CreditCard, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { solicitarInscripcion } from "./actions";

export function SolicitarButton({ cursoId, nombre, solicitado, gratis }: { cursoId: string; nombre: string; solicitado: boolean; gratis: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // Cursos de pago: se pagan en línea con Mercado Pago y la inscripción es automática
  if (!gratis) {
    return (
      <Button className="w-full" asChild>
        <Link href={`/workspace/pagar/${cursoId}`}>
          {solicitado ? <CreditCard /> : <ShoppingCart />} {solicitado ? "Completar pago" : "Quiero este curso"}
        </Link>
      </Button>
    );
  }

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
      onClick={async () => {
        const ok = await confirmar("El pastor recibirá tu solicitud. Cuando quede aprobada, el curso aparecerá en tu menú.", {
          titulo: `¿Inscribirte en "${nombre}"?`,
          textoConfirmar: "Sí, quiero inscribirme",
        });
        if (!ok) return;
        startTransition(async () => {
          const res = await solicitarInscripcion(cursoId);
          if (!res.success) return void toast.error(res.error);
          toast.success("¡Solicitud enviada! Te avisaremos cuando quedes inscrito.");
          router.refresh();
        });
      }}
    >
      <ShoppingCart /> {pending ? "Enviando..." : "Quiero inscribirme"}
    </Button>
  );
}
