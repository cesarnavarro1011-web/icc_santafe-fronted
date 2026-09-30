import Link from "next/link";
import { Mail, MessageCircle, Plus, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormDialog } from "@/components/workspace/form-dialog";
import { EmptyState, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { fechaHora } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { correoConfigurado } from "@/lib/server/mail";
import { requirePage } from "@/lib/server/session";
import { whatsappConfigurado } from "@/lib/server/whatsapp";
import { guardarComunicado } from "./actions";
import { ComunicadoFields } from "./comunicado-form";
import { describirDestino, opcionesDestino } from "./datos";

const ESTADO = {
  BORRADOR: { label: "Borrador", variant: "muted" },
  ENVIANDO: { label: "Enviando…", variant: "info" },
  ENVIADO: { label: "Enviado", variant: "success" },
} as const;

export default async function ComunicadosPage() {
  await requirePage(R.COMUNICADOS);
  const [comunicados, opciones] = await Promise.all([
    prisma.comunicado.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    opcionesDestino(),
  ]);

  return (
    <>
      <PageHeader
        title="Comunicados"
        description="Avisos informativos masivos por correo y WhatsApp. Guarda un borrador, envíate una prueba y luego envíalo a todos."
        actions={
          <FormDialog
            title="Nuevo comunicado"
            action={guardarComunicado.bind(null, null)}
            successMessage="Borrador guardado. Ábrelo para enviar una prueba o enviarlo."
            submitLabel="Guardar borrador"
            className="sm:max-w-2xl"
            trigger={
              <Button>
                <Plus /> Nuevo comunicado
              </Button>
            }
          >
            <ComunicadoFields opciones={opciones} whatsapp={whatsappConfigurado()} />
          </FormDialog>
        }
      />

      {(!correoConfigurado() || !whatsappConfigurado()) && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Modo local:{" "}
          {!correoConfigurado() && <>sin <strong>SMTP</strong> configurado, los correos se imprimen en la consola del servidor. </>}
          {!whatsappConfigurado() && <>sin <strong>WhatsApp</strong> configurado, los mensajes se imprimen en la consola. </>}
          Configúralos en el archivo <code>.env</code>.
        </p>
      )}

      <Panel>
        {comunicados.length === 0 ? (
          <EmptyState icon={Send}>Aún no hay comunicados. Crea el primero.</EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asunto</TableHead>
                <TableHead>Para</TableHead>
                <TableHead>Canales</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Enviados</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comunicados.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="max-w-72">
                    <Link href={`/workspace/comunicados/${c.id}`} className="font-medium hover:underline">
                      {c.asunto}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs">{describirDestino(c, opciones)}</TableCell>
                  <TableCell>
                    <span className="text-muted-foreground flex gap-2">
                      {c.porCorreo && <Mail className="size-4" aria-label="Correo" />}
                      {c.porWhatsapp && <MessageCircle className="size-4 text-emerald-600" aria-label="WhatsApp" />}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ESTADO[c.estado].variant}>{ESTADO[c.estado].label}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {c.estado === "BORRADOR" ? "—" : `${c.enviados}/${c.total - c.omitidos}`}
                    {c.fallidos > 0 && <span className="ml-1 text-red-600">({c.fallidos} fallidos)</span>}
                  </TableCell>
                  <TableCell className="text-xs">{fechaHora(c.enviadoAt ?? c.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
