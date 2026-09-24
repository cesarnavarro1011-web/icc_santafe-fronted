import Link from "next/link";
import { Award, Check, Download, ExternalLink, Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { fecha } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/server/session";
import { cn } from "@/lib/utils";

function Paso({ label, at }: { label: string; at: Date | null }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={cn("flex size-5 items-center justify-center rounded-full", at ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground")}>
        {at ? <Check className="size-3" /> : <Hourglass className="size-3" />}
      </span>
      <span className={at ? "" : "text-muted-foreground"}>
        {label}
        {at && <span className="text-muted-foreground"> · {fecha(at)}</span>}
      </span>
    </div>
  );
}

export default async function MisCertificadosPage() {
  const user = await requirePage();
  const certificados = await prisma.certificado.findMany({
    where: { fielId: user.fielId, estado: { not: "ANULADO" } },
    include: { curso: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader title="Mis certificados" description="Tus diplomas emitidos y los que están en proceso de firma" />
      {certificados.length === 0 ? (
        <Panel>
          <EmptyState icon={Award}>
            Aún no tienes certificados. Cuando apruebes un curso, tu maestro iniciará el proceso.{" "}
            <Link href="/workspace/mis-cursos" className="text-violet-700 hover:underline">
              Ver mis cursos
            </Link>
          </EmptyState>
        </Panel>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {certificados.map((c) => {
            const emitido = c.estado === "EMITIDO";
            return (
              <div key={c.id} className="bg-card overflow-hidden rounded-2xl border shadow-sm">
                <div className={cn("bg-gradient-to-br p-5 text-white", emitido ? "from-emerald-500 to-teal-600" : "from-amber-400 to-orange-500")}>
                  <Award className="mb-2 size-8" />
                  <h3 className="text-lg font-bold">{c.curso.nombre}</h3>
                  <p className="text-xs text-white/80">
                    {c.codigo} · {emitido ? `Emitido ${fecha(c.emitidoAt)}` : "En proceso de firma"}
                  </p>
                </div>
                <div className="space-y-3 p-5">
                  <Paso label="Firma del maestro" at={c.firmaMaestroAt} />
                  <Paso label="Firma del supervisor" at={c.firmaSupervisorAt} />
                  <Paso label="Firma del pastor" at={c.firmaPastorAt} />
                  {c.pdfPath ? (
                    <Button asChild className="mt-2 w-full">
                      <a href={`/api/archivos/certificado/${c.id}?descargar`}>
                        <Download /> Descargar PDF
                      </a>
                    </Button>
                  ) : c.linkExterno ? (
                    <Button asChild variant="outline" className="mt-2 w-full">
                      <a href={c.linkExterno} target="_blank" rel="noreferrer">
                        <ExternalLink /> Ver certificado
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
