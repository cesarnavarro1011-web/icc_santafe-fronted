import { ExternalLink, Radio, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ActionButton } from "@/components/workspace/action-button";
import { FormInline } from "@/components/workspace/form-inline";
import { Field, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { R } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { embedEnVivo, obtenerSitio } from "@/server/contenido";
import { cambiarEnVivo, guardarEnVivo } from "../actions";

/** Date → "2026-09-30T12:00" en hora Colombia, para el input datetime-local. */
function aInputColombia(d: Date | null) {
  if (!d) return "";
  return new Date(d.getTime() - 5 * 3_600_000).toISOString().slice(0, 16);
}

const horaCorta = (d: Date) => d.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" });

export default async function EnVivoPage() {
  await requirePage(R.CONTENIDO);
  const s = await obtenerSitio();
  const vencida = !!s.envivoHasta && s.envivoHasta <= new Date();
  const alAire = s.envivoActivo && !!s.envivoUrl && !vencida;
  const plataforma = s.envivoUrl ? embedEnVivo(s.envivoUrl)?.plataforma : null;

  return (
    <>
      <PageHeader
        title="Transmisión en vivo"
        description="Cuando está activa, la portada muestra “En vivo” en el encabezado y, justo debajo, el reproductor para verla sin salir de la página."
        actions={
          <Button variant="outline" asChild>
            <a href="/#en-vivo" target="_blank" rel="noreferrer">
              <ExternalLink /> Ver portada
            </a>
          </Button>
        }
      />

      {/* Estado y botón principal */}
      <section
        className={`flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${
          alAire ? "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10" : "bg-card"
        }`}
      >
        <div className="flex items-center gap-4">
          <span className={`relative flex size-12 items-center justify-center rounded-full ${alAire ? "bg-red-600 text-white" : "bg-muted text-muted-foreground"}`}>
            {alAire && <span className="absolute inset-0 animate-ping rounded-full bg-red-500/40" />}
            <Radio className="relative size-6" />
          </span>
          <div>
            <p className="text-lg font-semibold">{alAire ? "Estamos en vivo" : "Sin transmisión"}</p>
            <p className="text-muted-foreground text-sm">
              {alAire
                ? `Se ve en la portada${plataforma ? ` (${plataforma})` : ""}${s.envivoHasta ? ` · se apaga sola a las ${horaCorta(s.envivoHasta)}` : ""}.`
                : vencida && s.envivoActivo
                  ? "La transmisión terminó por la hora de fin programada."
                  : s.envivoUrl
                    ? "El enlace está listo. Pulsa “Estamos en vivo” cuando empiece el servicio."
                    : "Pega abajo el enlace de la transmisión y guárdalo."}
            </p>
          </div>
        </div>
        {alAire ? (
          <ActionButton variant="outline" action={cambiarEnVivo.bind(null, false)} confirm="¿Terminar la transmisión? Dejará de verse en la portada." successMessage="Transmisión terminada">
            <Square /> Terminar transmisión
          </ActionButton>
        ) : (
          <ActionButton className="bg-red-600 text-white hover:bg-red-700" action={cambiarEnVivo.bind(null, true)} successMessage="¡Listo! La portada ya muestra la transmisión en vivo">
            <Radio /> Estamos en vivo
          </ActionButton>
        )}
      </section>

      <Panel title="Datos de la transmisión">
        <FormInline action={guardarEnVivo} successMessage="Transmisión guardada">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Enlace de la transmisión" className="sm:col-span-2">
              <Input name="envivoUrl" type="url" defaultValue={s.envivoUrl ?? ""} placeholder="https://www.youtube.com/live/… o https://www.facebook.com/…/videos/…" />
              <p className="text-muted-foreground text-xs">
                YouTube: el enlace del en vivo (youtube.com/live/…) o del canal (youtube.com/channel/UC…/live, sirve para todos los domingos). Facebook: el
                enlace del video en vivo. También Vimeo.
              </p>
            </Field>
            <Field label="Título">
              <Input name="envivoTitulo" defaultValue={s.envivoTitulo ?? ""} placeholder="Servicio en vivo" />
            </Field>
            <Field label="Terminar automáticamente a las (opcional)">
              <Input name="envivoHasta" type="datetime-local" defaultValue={vencida ? "" : aInputColombia(s.envivoHasta)} />
              <p className="text-muted-foreground text-xs">Hora de Colombia. Por si olvidan pulsar “Terminar transmisión”.</p>
            </Field>
            <Field label="Descripción (opcional)" className="sm:col-span-2">
              <Textarea name="envivoDescripcion" rows={2} defaultValue={s.envivoDescripcion ?? ""} placeholder="Ej: Culto dominical con el Pastor Hernando Rincón" />
            </Field>
            <Field label="Próxima transmisión (se muestra cuando no están en vivo)" className="sm:col-span-2">
              <Input name="envivoProxima" defaultValue={s.envivoProxima ?? ""} placeholder="Ej: Domingos 10:00 a. m. · Miércoles 7:00 p. m." />
            </Field>
          </div>
        </FormInline>
      </Panel>
    </>
  );
}
