import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/workspace/ui-kit";
import { dinero } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { mercadoPagoConfigurado } from "@/lib/server/mercadopago";
import { requirePage } from "@/lib/server/session";
import { procesarPagoMercadoPago } from "@/server/pagos";
import { SimularPago, VerificarDeNuevo } from "./cliente";

// Mercado Pago devuelve aquí con ?payment_id=…&status=…&external_reference=…
// El estado NO se toma de la URL: se consulta a Mercado Pago (en local no llegan los webhooks).
export default async function ResultadoPagoPage({
  searchParams,
}: {
  searchParams: Promise<{ ins?: string; payment_id?: string; collection_id?: string; simulado?: string }>;
}) {
  const user = await requirePage();
  const sp = await searchParams;
  const pagoId = sp.payment_id || sp.collection_id;
  let error: string | null = null;

  if (pagoId && /^\d+$/.test(pagoId) && mercadoPagoConfigurado()) {
    try {
      await procesarPagoMercadoPago(pagoId);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  if (!sp.ins) notFound();
  const i = await prisma.inscripcion.findUnique({ where: { id: sp.ins }, include: { curso: true } });
  if (!i || i.fielId !== user.fielId) notFound();

  const aprobado = i.estadoPago === "COMPLETADO" || i.estadoPago === "EXENTO";
  const rechazado = !aprobado && ["rejected", "cancelled", "monto_invalido"].includes(i.mpEstado ?? "");
  const total = Number(i.costoTotal) - Number(i.descuento);

  return (
    <div className="mx-auto w-full max-w-lg pt-6">
      <Panel>
        <div className="space-y-4 py-4 text-center">
          {aprobado ? (
            <>
              <CheckCircle2 className="mx-auto size-16 text-emerald-500" />
              <h1 className="text-2xl font-bold">¡Pago aprobado!</h1>
              <p className="text-muted-foreground">
                Ya tienes acceso a <strong className="text-foreground">{i.curso.nombre}</strong>. Te enviamos la confirmación a tu correo.
              </p>
              <Button asChild size="lg">
                <Link href={`/workspace/mis-cursos/${i.cursoId}`}>Ir al curso</Link>
              </Button>
            </>
          ) : rechazado ? (
            <>
              <XCircle className="mx-auto size-16 text-red-500" />
              <h1 className="text-2xl font-bold">El pago no se completó</h1>
              <p className="text-muted-foreground">
                {i.mpEstado === "monto_invalido"
                  ? "El monto pagado no coincide con el valor del curso. La administración lo revisará."
                  : "Mercado Pago rechazó el pago. Puedes intentarlo de nuevo con otro medio."}
              </p>
              <Button asChild>
                <Link href={`/workspace/pagar/${i.cursoId}`}>Intentar de nuevo</Link>
              </Button>
            </>
          ) : (
            <>
              <Clock className="mx-auto size-16 text-amber-500" />
              <h1 className="text-2xl font-bold">Pago en proceso</h1>
              <p className="text-muted-foreground">
                {sp.simulado
                  ? "Mercado Pago no está configurado: estás en modo desarrollo."
                  : "Mercado Pago aún no confirma el pago (pasa con PSE o pagos en efectivo). Cuando se apruebe quedarás inscrito automáticamente y te avisaremos por correo."}
              </p>
              <p className="text-sm">
                {i.curso.nombre} · <strong>{dinero(total)}</strong>
              </p>
              {sp.simulado ? <SimularPago inscripcionId={i.id} /> : <VerificarDeNuevo />}
              <Button asChild variant="ghost">
                <Link href="/workspace">Volver al inicio</Link>
              </Button>
            </>
          )}
          {error && <p className="text-xs text-red-600">No se pudo consultar Mercado Pago: {error}</p>}
          <p className="text-muted-foreground text-xs">Inscripción {i.codigo}</p>
        </div>
      </Panel>
    </div>
  );
}
