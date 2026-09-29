import type { WebHistoria, WebPersona } from "@prisma/client";
import { ExternalLink, History, Pencil, Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/workspace/form-dialog";
import { FormInline } from "@/components/workspace/form-inline";
import { EmptyState, Field, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { obtenerSitio, urlImagen, type Estadistica } from "@/server/contenido";
import { guardarContactoIglesia, guardarHistoria, guardarNosotros, guardarPersona } from "../actions";
import { AccionesContenido, EstadoPublicacionBadge, ImagenField, PublicacionFields } from "../campos";

const SECCIONES = [
  { value: "actuales", label: "Sucesión pastoral · pastorado actual" },
  { value: "fundadores", label: "Sucesión pastoral · pastorado fundacional" },
  { value: "equipo", label: "Equipo pastoral" },
] as const;

function HistoriaFields({ h }: { h?: WebHistoria }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Título *">
        <Input name="titulo" defaultValue={h?.titulo} maxLength={120} required placeholder="Ej: Los primeros años" />
      </Field>
      <Field label="Periodo">
        <Input name="periodo" defaultValue={h?.periodo ?? ""} placeholder="Ej: 1999 - 2005" />
      </Field>
      <Field label="Texto *" className="sm:col-span-2">
        <Textarea name="texto" rows={5} defaultValue={h?.texto} required />
      </Field>
      <ImagenField actual={h ? urlImagen(h) : null} etiqueta="Foto de la etapa" />
      <PublicacionFields estado={h?.estado} programable={false} />
    </div>
  );
}

function PersonaFields({ p, seccion }: { p?: WebPersona; seccion?: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nombre *">
        <Input name="nombre" defaultValue={p?.nombre} maxLength={120} required placeholder="Ej: Pr. Nando Rincón" />
      </Field>
      <Field label="Cargo">
        <Input name="cargo" defaultValue={p?.cargo ?? ""} placeholder="Ej: Pastor principal" />
      </Field>
      <Field label="Dónde aparece *" className="sm:col-span-2">
        <NativeSelect name="seccion" defaultValue={p?.seccion ?? seccion ?? "equipo"}>
          {SECCIONES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Reseña (solo se muestra en Equipo pastoral)" className="sm:col-span-2">
        <Textarea name="descripcion" rows={3} defaultValue={p?.descripcion ?? ""} />
      </Field>
      <ImagenField actual={p ? urlImagen(p) : null} etiqueta="Foto" ayuda="Foto cuadrada o vertical. JPG, PNG o WebP, máx. 5 MB." />
      <PublicacionFields estado={p?.estado} programable={false} />
    </div>
  );
}

export default async function DatosIglesiaPage() {
  await requirePage(R.CONTENIDO);
  const [s, historia, personas] = await Promise.all([
    obtenerSitio(),
    prisma.webHistoria.findMany({ orderBy: [{ orden: "asc" }, { createdAt: "asc" }] }),
    prisma.webPersona.findMany({ orderBy: [{ orden: "asc" }, { createdAt: "asc" }] }),
  ]);
  const cifras = (Array.isArray(s.estadisticas) ? s.estadisticas : []) as Estadistica[];

  return (
    <>
      <PageHeader
        title="Datos de la iglesia"
        description="Contacto, horarios, redes y la página Nosotros. Se actualizan en todo el sitio al guardar."
        actions={
          <>
            <Button variant="outline" asChild>
              <a href="/nosotros" target="_blank" rel="noreferrer">
                <ExternalLink /> Ver Nosotros
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/contactanos" target="_blank" rel="noreferrer">
                <ExternalLink /> Ver Contáctanos
              </a>
            </Button>
          </>
        }
      />

      <nav className="flex flex-wrap gap-2 text-sm">
        {[
          ["#contacto", "Contacto y horarios"],
          ["#nosotros", "Nosotros"],
          ["#historia", "Historia"],
          ["#personas", "Pastores y equipo"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="bg-muted hover:bg-accent rounded-full px-3 py-1">
            {label}
          </a>
        ))}
      </nav>

      <Panel title="Contacto, horarios y redes" className="scroll-mt-20">
        <div id="contacto" className="scroll-mt-24" />
        <FormInline action={guardarContactoIglesia} successMessage="Datos de contacto actualizados en todo el sitio">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre de la iglesia *">
              <Input name="nombre" defaultValue={s.nombre} required />
            </Field>
            <Field label="Lema">
              <Input name="lema" defaultValue={s.lema ?? ""} placeholder="Ej: Creciendo en número y en conocimiento" />
            </Field>
            <Field label="Texto del pie de página" className="sm:col-span-2">
              <Textarea name="descripcion" rows={2} defaultValue={s.descripcion ?? ""} />
            </Field>
            <Field label="Teléfono">
              <Input name="telefono" type="tel" defaultValue={s.telefono ?? ""} placeholder="Ej: 301 483 9591" />
            </Field>
            <Field label="WhatsApp">
              <Input name="whatsapp" type="tel" defaultValue={s.whatsapp ?? ""} placeholder="Ej: 301 483 9591 (el botón abre el chat)" />
            </Field>
            <Field label="Correo">
              <Input name="correo" type="email" defaultValue={s.correo ?? ""} placeholder="Ej: contacto@iccsantafe.com" />
            </Field>
            <Field label="Teléfono de emergencias pastorales">
              <Input name="emergencias" type="tel" defaultValue={s.emergencias ?? ""} placeholder="Vacío = no se muestra" />
            </Field>
            <Field label="Dirección">
              <Input name="direccion" defaultValue={s.direccion ?? ""} placeholder="Ej: Carrera 43 #16-05 Barrio Santa Fe" />
            </Field>
            <Field label="Ciudad">
              <Input name="ciudad" defaultValue={s.ciudad ?? ""} placeholder="Ej: Barranquilla, Atlántico" />
            </Field>
            <Field label="Enlace de Google Maps" className="sm:col-span-2">
              <Input name="mapaUrl" defaultValue={s.mapaUrl ?? ""} placeholder="https://maps.app.goo.gl/… (botón “Cómo llegar”)" />
            </Field>
            <ImagenField
              actual={s.contactoImagenPath ? urlImagen({ imagenPath: s.contactoImagenPath, updatedAt: s.updatedAt }) : null}
              etiqueta="Imagen de fondo de Contáctanos"
              ayuda="Horizontal (ej. 1920×600). Sin imagen se usa el degradado azul-morado."
            />
            <Field label="Horarios de servicio" className="sm:col-span-2">
              <Textarea
                name="horarios"
                rows={8}
                defaultValue={s.horarios ?? ""}
                className="font-mono text-sm"
                placeholder={"Domingos\n9:00 a. m. — Escuela dominical\n10:00 a. m. — Servicio principal\n\nMiércoles\n7:00 p. m. — Reunión de oración"}
              />
              <p className="text-muted-foreground text-xs">
                Primera línea: el día. Debajo, un horario por línea. Deja una <strong>línea en blanco</strong> entre un día y otro.
              </p>
            </Field>
            <Field label="Facebook">
              <Input name="facebook" defaultValue={s.facebook ?? ""} placeholder="https://facebook.com/…" />
            </Field>
            <Field label="Instagram">
              <Input name="instagram" defaultValue={s.instagram ?? ""} placeholder="https://instagram.com/…" />
            </Field>
            <Field label="YouTube">
              <Input name="youtube" defaultValue={s.youtube ?? ""} placeholder="https://youtube.com/@…" />
            </Field>
            <Field label="TikTok">
              <Input name="tiktok" defaultValue={s.tiktok ?? ""} placeholder="https://tiktok.com/@…" />
            </Field>
          </div>
          <p className="text-muted-foreground text-xs">Lo que dejes vacío no aparece en la página.</p>
        </FormInline>
      </Panel>

      <Panel title="Página Nosotros">
        <div id="nosotros" className="scroll-mt-24" />
        <FormInline action={guardarNosotros} successMessage="Página Nosotros actualizada">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Título principal">
              <Input name="nosotrosTitulo" defaultValue={s.nosotrosTitulo ?? ""} placeholder="Ej: Nuestra Historia, Nuestra Fe" />
            </Field>
            <Field label="Texto de bienvenida" className="sm:col-span-2">
              <Textarea name="nosotrosTexto" rows={3} defaultValue={s.nosotrosTexto ?? ""} />
            </Field>
            <ImagenField
              actual={s.nosotrosImagenPath ? urlImagen({ imagenPath: s.nosotrosImagenPath, updatedAt: s.updatedAt }) : null}
              etiqueta="Imagen de fondo del encabezado"
              ayuda="Horizontal (ej. 1920×800). Sin imagen se usa la foto actual de la congregación."
            />
            <Field label="Misión" className="sm:col-span-2">
              <Textarea name="mision" rows={3} defaultValue={s.mision ?? ""} />
            </Field>
            <Field label="Visión" className="sm:col-span-2">
              <Textarea name="vision" rows={3} defaultValue={s.vision ?? ""} />
            </Field>
            <Field label="Valores (uno por línea)" className="sm:col-span-2">
              <Textarea name="valores" rows={6} defaultValue={s.valores ?? ""} />
            </Field>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Cifras destacadas (hasta 4)</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="grid gap-2 rounded-lg border p-3">
                  <Input name={`valor_${i}`} defaultValue={cifras[i - 1]?.valor ?? ""} placeholder="Ej: 300+" />
                  <Input name={`etiqueta_${i}`} defaultValue={cifras[i - 1]?.etiqueta ?? ""} placeholder="Ej: Miembros activos" />
                </div>
              ))}
            </div>
          </div>
        </FormInline>
      </Panel>

      <Panel
        title={<span className="flex items-center gap-2"><History className="size-4 text-violet-500" /> Nuestra historia</span>}
        actions={
          <FormDialog
            title="Nueva etapa"
            action={guardarHistoria.bind(null, null)}
            successMessage="Etapa guardada"
            trigger={
              <Button size="sm">
                <Plus /> Etapa
              </Button>
            }
          >
            <HistoriaFields />
          </FormDialog>
        }
      >
        <div id="historia" className="scroll-mt-24" />
        {historia.length === 0 ? (
          <EmptyState icon={History}>Sin etapas. Si no publicas ninguna, la sección Historia no aparece.</EmptyState>
        ) : (
          <ol className="divide-y">
            {historia.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {h.titulo} {h.periodo && <span className="text-muted-foreground text-xs">· {h.periodo}</span>}
                  </p>
                  <p className="text-muted-foreground line-clamp-1 max-w-2xl text-xs">{h.texto}</p>
                </div>
                <div className="flex items-center gap-1">
                  <EstadoPublicacionBadge estado={h.estado} />
                  <FormDialog
                    title="Editar etapa"
                    action={guardarHistoria.bind(null, h.id)}
                    successMessage="Etapa actualizada"
                    trigger={
                      <Button size="icon-sm" variant="outline" aria-label="Editar">
                        <Pencil />
                      </Button>
                    }
                  >
                    <HistoriaFields h={h} />
                  </FormDialog>
                  <AccionesContenido tabla="historia" id={h.id} estado={h.estado} nombre={h.titulo} ordenable />
                </div>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <div id="personas" className="scroll-mt-24 space-y-5">
        {SECCIONES.map((sec) => {
          const lista = personas.filter((p) => p.seccion === sec.value);
          return (
            <Panel
              key={sec.value}
              title={<span className="flex items-center gap-2"><UserRound className="size-4 text-violet-500" /> {sec.label}</span>}
              actions={
                <FormDialog
                  title={`Agregar · ${sec.label}`}
                  action={guardarPersona.bind(null, null)}
                  successMessage="Persona agregada"
                  trigger={
                    <Button size="sm" variant="outline">
                      <Plus /> Agregar
                    </Button>
                  }
                >
                  <PersonaFields seccion={sec.value} />
                </FormDialog>
              }
            >
              {lista.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nadie en esta sección. Si queda vacía, no aparece en la página.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {lista.map((p) => {
                    const img = urlImagen(p);
                    return (
                      <div key={p.id} className="flex items-center gap-3 rounded-lg border p-3">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img} alt={p.nombre} className="size-14 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <span className="bg-muted flex size-14 shrink-0 items-center justify-center rounded-lg">
                            <UserRound className="text-muted-foreground size-6" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{p.nombre}</p>
                          <p className="text-muted-foreground truncate text-xs">{p.cargo ?? "—"}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            <EstadoPublicacionBadge estado={p.estado} />
                            <FormDialog
                              title="Editar persona"
                              action={guardarPersona.bind(null, p.id)}
                              successMessage="Persona actualizada"
                              trigger={
                                <Button size="icon-sm" variant="outline" aria-label="Editar">
                                  <Pencil />
                                </Button>
                              }
                            >
                              <PersonaFields p={p} />
                            </FormDialog>
                            <AccionesContenido tabla="persona" id={p.id} estado={p.estado} nombre={p.nombre} ordenable />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          );
        })}
      </div>
    </>
  );
}
