import type { Prisma } from "@prisma/client";
import { Archive, BellOff, CheckCheck, Inbox, Mail, MailOpen, MessageCircle, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/workspace/action-button";
import { SearchBar } from "@/components/workspace/search-bar";
import { EmptyState, KpiCard, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { fechaHora } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { callmebotConfigurado } from "@/lib/server/aviso-iglesia";
import { requirePage } from "@/lib/server/session";
import { enlaceWhatsApp } from "@/server/contenido";
import { actualizarMensaje } from "../actions";

export default async function MensajesPage({ searchParams }: { searchParams: Promise<{ q?: string; ver?: string }> }) {
  await requirePage(R.CONTENIDO);
  const { q, ver } = await searchParams;
  const where: Prisma.MensajeContactoWhereInput = {
    archivado: ver === "archivados",
    ...(q
      ? {
          OR: [
            { nombre: { contains: q, mode: "insensitive" } },
            { mensaje: { contains: q, mode: "insensitive" } },
            { asunto: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [mensajes, sinLeer, total, sitio] = await Promise.all([
    prisma.mensajeContacto.findMany({ where, orderBy: [{ leido: "asc" }, { createdAt: "desc" }], take: 200 }),
    prisma.mensajeContacto.count({ where: { leido: false, archivado: false } }),
    prisma.mensajeContacto.count({ where: { archivado: false } }),
    prisma.webSitio.findUnique({ where: { id: "principal" }, select: { whatsapp: true, correo: true } }),
  ]);
  const avisoWhatsApp = callmebotConfigurado() && !!(process.env.CALLMEBOT_TELEFONO || sitio?.whatsapp);

  return (
    <>
      <PageHeader title="Mensajes de contacto" description="Lo que escriben los visitantes en Contáctanos. Cada mensaje también se avisa al WhatsApp y al correo de la iglesia." />

      {!avisoWhatsApp && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <BellOff className="mt-0.5 size-4 shrink-0" />
          <p>
            <strong>Los avisos por WhatsApp aún no están activos.</strong>{" "}
            {!sitio?.whatsapp
              ? "Falta el WhatsApp en Datos de la iglesia → Cómo comunicarse. "
              : "Falta configurar CallMeBot (CALLMEBOT_APIKEY en el servidor). "}
            Mientras tanto los mensajes igual llegan a esta bandeja{sitio?.correo ? " y al correo de la iglesia" : ""}.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KpiCard icon={Mail} label="Sin leer" value={sinLeer} color={sinLeer ? "amber" : "slate"} />
        <KpiCard icon={Inbox} label="En la bandeja" value={total} color="violet" />
        <KpiCard icon={MessageCircle} label="Aviso por WhatsApp" value={avisoWhatsApp ? "Activo" : "Inactivo"} color={avisoWhatsApp ? "green" : "slate"} />
      </div>

      <SearchBar
        placeholder="Buscar por nombre, asunto o mensaje..."
        filtros={[{ name: "ver", label: "Bandeja de entrada", options: [{ value: "archivados", label: "Archivados" }] }]}
      />

      <Panel>
        {mensajes.length === 0 ? (
          <EmptyState icon={Inbox}>No hay mensajes {ver === "archivados" ? "archivados" : "en la bandeja"}.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {mensajes.map((m) => {
              const wa = enlaceWhatsApp(m.telefono);
              return (
                <li key={m.id} className={`rounded-xl border p-4 ${m.leido ? "" : "border-violet-300 bg-violet-50/40 dark:border-violet-500/40 dark:bg-violet-500/5"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {!m.leido && <Badge variant="warning">Nuevo</Badge>}
                      <Badge variant="violet">{m.motivo}</Badge>
                      <span className="font-semibold">{m.nombre}</span>
                    </div>
                    <span className="text-muted-foreground text-xs">{fechaHora(m.createdAt)}</span>
                  </div>
                  {m.asunto && <p className="mt-2 text-sm font-medium">{m.asunto}</p>}
                  <p className="mt-1 text-sm whitespace-pre-line">{m.mensaje}</p>
                  <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {m.telefono && (
                      <span className="flex items-center gap-1">
                        <Phone className="size-3.5" /> {m.telefono}
                      </span>
                    )}
                    {m.correo && (
                      <span className="flex items-center gap-1">
                        <Mail className="size-3.5" /> {m.correo}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {wa && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={`${wa}?text=${encodeURIComponent(`Hola ${m.nombre}, te escribimos de la iglesia por tu mensaje en la página web.`)}`} target="_blank" rel="noreferrer">
                          <MessageCircle className="text-emerald-600" /> Responder por WhatsApp
                        </a>
                      </Button>
                    )}
                    {m.correo && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={`mailto:${m.correo}?subject=${encodeURIComponent(`Re: ${m.asunto || m.motivo}`)}`}>
                          <Mail /> Responder por correo
                        </a>
                      </Button>
                    )}
                    <ActionButton size="sm" variant="ghost" successMessage={m.leido ? "Marcado como no leído" : "Marcado como leído"} action={actualizarMensaje.bind(null, m.id, { leido: !m.leido })}>
                      {m.leido ? <MailOpen /> : <CheckCheck />} {m.leido ? "No leído" : "Leído"}
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      variant="ghost"
                      successMessage={m.archivado ? "Devuelto a la bandeja" : "Archivado"}
                      action={actualizarMensaje.bind(null, m.id, { archivado: !m.archivado, leido: true })}
                    >
                      <Archive /> {m.archivado ? "Desarchivar" : "Archivar"}
                    </ActionButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
