import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Copy, Mail, MessageCircle, Pencil, Play, RotateCcw, Send, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionButton } from "@/components/workspace/action-button";
import { FormDialog } from "@/components/workspace/form-dialog";
import { KpiCard, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { fechaHora } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { contarDestinatarios, cuerpoHtml, cuerpoTexto, estaProcesando, leerDestinatarios } from "@/server/comunicados";
import { duplicarComunicado, eliminarComunicado, enviarComunicado, guardarComunicado, reanudarComunicado, reintentarComunicado } from "../actions";
import { ComunicadoFields } from "../comunicado-form";
import { datosFormulario, describirDestino, opcionesDestino } from "../datos";
import { AutoRefresco, BotonPrueba } from "./cliente";

export default async function ComunicadoPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePage(R.COMUNICADOS);
  const { id } = await params;
  const c = await prisma.comunicado.findUnique({ where: { id } });
  if (!c) notFound();

  const [opciones, conteo, fallidos] = await Promise.all([
    opcionesDestino(),
    contarDestinatarios(leerDestinatarios(c.destinatarios)),
    prisma.envioComunicado.findMany({ where: { comunicadoId: id, estado: "FALLIDO" }, take: 50, orderBy: { enviadoAt: "desc" } }),
  ]);
  const nombresFallidos = await prisma.fiel.findMany({ where: { id: { in: fallidos.map((f) => f.fielId) } }, select: { id: true, nombre: true, apellido: true } });

  const borrador = c.estado === "BORRADOR";
  const enviando = c.estado === "ENVIANDO";
  const detenido = enviando && !estaProcesando(id); // p. ej. se reinició el servidor a mitad del envío
  const aEnviar = c.total - c.omitidos;
  const avance = aEnviar > 0 ? Math.round(((c.enviados + c.fallidos) / aEnviar) * 100) : 0;
  const datos = datosFormulario(c);
  const ejemploNombre = user.name.split(" ")[0] || "hermano";

  return (
    <>
      <AutoRefresco activo={enviando && !detenido} />
      <Link href="/workspace/comunicados" className="text-muted-foreground flex items-center gap-1 text-sm hover:underline">
        <ArrowLeft className="size-4" /> Comunicados
      </Link>
      <PageHeader
        title={c.asunto}
        description={`${describirDestino(c, opciones)} · ${[c.porCorreo && "Correo", c.porWhatsapp && "WhatsApp"].filter(Boolean).join(" y ")}`}
        actions={
          <>
            <BotonPrueba id={c.id} />
            {borrador && (
              <>
                <FormDialog
                  title="Editar comunicado"
                  action={guardarComunicado.bind(null, c.id)}
                  successMessage="Borrador actualizado"
                  className="sm:max-w-2xl"
                  trigger={
                    <Button variant="outline">
                      <Pencil /> Editar
                    </Button>
                  }
                >
                  <ComunicadoFields c={datos} opciones={opciones} />
                </FormDialog>
                <ActionButton
                  confirm={`¿Enviar "${c.asunto}" a ${describirDestino(c, opciones).toLowerCase()}? Esta acción no se puede deshacer.`}
                  successMessage="Envío iniciado. Puedes seguir el avance aquí."
                  action={enviarComunicado.bind(null, c.id)}
                  disabled={conteo.total === 0}
                >
                  <Send /> Enviar ahora
                </ActionButton>
              </>
            )}
            {!borrador && (
              <ActionButton variant="outline" successMessage="Copia creada como borrador" action={duplicarComunicado.bind(null, c.id)}>
                <Copy /> Duplicar
              </ActionButton>
            )}
            {!enviando && (
              <ActionButton
                variant="ghost"
                aria-label="Eliminar"
                confirm="¿Eliminar este comunicado y su historial de envío?"
                successMessage="Comunicado eliminado"
                action={eliminarComunicado.bind(null, c.id)}
              >
                <Trash2 className="text-red-600" />
              </ActionButton>
            )}
          </>
        }
      />

      {borrador ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard icon={Users} label="Destinatarios" value={conteo.total} color="violet" sub="fieles activos que cumplen el filtro" />
          <KpiCard icon={Mail} label="Con correo" value={c.porCorreo ? conteo.conCorreo : "—"} color="blue" sub={c.porCorreo ? "recibirán el correo" : "canal no elegido"} />
          <KpiCard icon={MessageCircle} label="Con celular" value={c.porWhatsapp ? conteo.conCelular : "—"} color="green" sub={c.porWhatsapp ? "recibirán el WhatsApp" : "canal no elegido"} />
          <KpiCard icon={Users} label="Dados de baja" value={conteo.deBaja} color="slate" sub="no reciben comunicados" />
        </div>
      ) : (
        <Panel
          title={enviando ? (detenido ? "Envío detenido" : "Enviando…") : "Envío terminado"}
          actions={
            <div className="flex gap-2">
              {detenido && (
                <ActionButton size="sm" successMessage="Envío reanudado" action={reanudarComunicado.bind(null, c.id)}>
                  <Play /> Reanudar
                </ActionButton>
              )}
              {!enviando && c.fallidos > 0 && (
                <ActionButton size="sm" variant="outline" successMessage="Reintentando los fallidos" action={reintentarComunicado.bind(null, c.id)}>
                  <RotateCcw /> Reintentar {c.fallidos} fallidos
                </ActionButton>
              )}
            </div>
          }
        >
          <div className="mb-2 flex justify-between text-sm">
            <span>
              <strong className="tabular-nums">{c.enviados}</strong> enviados de {aEnviar}
              {c.fallidos > 0 && <span className="text-red-600"> · {c.fallidos} fallidos</span>}
              {c.omitidos > 0 && <span className="text-muted-foreground"> · {c.omitidos} omitidos (sin dato o dados de baja)</span>}
            </span>
            <span className="tabular-nums">{avance}%</span>
          </div>
          <Progress value={avance} barClassName={c.fallidos ? "bg-amber-500" : "bg-emerald-500"} />
          <p className="text-muted-foreground mt-2 text-xs">Iniciado {fechaHora(c.enviadoAt)}</p>
        </Panel>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {c.porCorreo && (
          <Panel title={<span className="flex items-center gap-2"><Mail className="size-4" /> Vista previa del correo</span>}>
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-muted-foreground mb-3 text-xs">
                Asunto: <strong className="text-foreground">{c.asunto}</strong>
              </p>
              <div className="rounded-lg bg-white p-4 text-sm">
                {datos.imagenes.map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={img.ruta} src={img.url} alt="" className="mb-3 w-full rounded-lg" />
                ))}
                <div className="text-slate-600" dangerouslySetInnerHTML={{ __html: cuerpoHtml(c.cuerpo, ejemploNombre) }} />
                {c.enlaceUrl && (
                  <p className="mt-4 text-center">
                    <span className="inline-block rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white">{c.enlaceTexto || "Ver más"}</span>
                  </p>
                )}
              </div>
              <p className="text-muted-foreground mt-2 text-center text-[11px]">Incluye al final el enlace “No quiero recibir más comunicados”.</p>
            </div>
          </Panel>
        )}
        {c.porWhatsapp && (
          <Panel title={<span className="flex items-center gap-2"><MessageCircle className="size-4 text-emerald-600" /> Vista previa de WhatsApp</span>}>
            <div className="rounded-lg bg-[#efeae2] p-4">
              <div className="max-w-sm rounded-lg bg-white p-3 text-sm whitespace-pre-line shadow-sm">
                <p className="mb-1 font-semibold">{c.asunto}</p>
                {cuerpoTexto(c.cuerpo, ejemploNombre)}
                {c.enlaceUrl && <p className="mt-2 text-sky-700">{c.enlaceTexto || "Ver más"}: {c.enlaceUrl}</p>}
              </div>
              <p className="text-muted-foreground mt-2 text-[11px]">
                Se envía con la plantilla aprobada en Meta; el texto final depende de cómo esté redactada. No incluye imágenes.
              </p>
            </div>
          </Panel>
        )}
      </div>

      {fallidos.length > 0 && (
        <Panel title="Envíos fallidos">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Persona</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fallidos.map((f) => {
                const p = nombresFallidos.find((n) => n.id === f.fielId);
                return (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{p ? `${p.nombre} ${p.apellido}` : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={f.canal === "CORREO" ? "info" : "success"}>{f.canal === "CORREO" ? "Correo" : "WhatsApp"}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{f.destino ?? "—"}</TableCell>
                    <TableCell className="max-w-80 text-xs text-red-600">{f.error}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Panel>
      )}
    </>
  );
}
