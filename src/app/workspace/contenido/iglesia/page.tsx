import type { WebHistoria, WebPersona } from "@prisma/client";
import {
  CircleAlert,
  Clock,
  ExternalLink,
  Eye,
  Facebook,
  Heart,
  History,
  Image as ImageIcon,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  Navigation,
  Pencil,
  Phone,
  Plus,
  Share2,
  Siren,
  Target,
  UserRound,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
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
import { obtenerSitio, parsearHorarios, urlImagen, type Estadistica } from "@/server/contenido";
import { guardarContactoIglesia, guardarHistoria, guardarImagenLogin, guardarNosotros, guardarPersona } from "../actions";
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

function Dato({ icon: Icon, label, valor, color }: { icon: LucideIcon; label: string; valor: string | null; color: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{label}</p>
        {valor ? (
          <p className="truncate text-sm font-medium">{valor}</p>
        ) : (
          <p className="text-muted-foreground/70 text-sm italic">Sin definir · no se muestra</p>
        )}
      </div>
    </div>
  );
}

function Tarjeta({ icon: Icon, titulo, accion, children }: { icon: LucideIcon; titulo: string; accion: ReactNode; children: ReactNode }) {
  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <Icon className="size-4 text-violet-500" /> {titulo}
        </span>
      }
      actions={accion}
    >
      {children}
    </Panel>
  );
}

function Seccion({ id, titulo, descripcion }: { id: string; titulo: string; descripcion: string }) {
  return (
    <div id={id} className="scroll-mt-24 pt-2">
      <h2 className="text-lg font-semibold tracking-tight">{titulo}</h2>
      <p className="text-muted-foreground text-sm">{descripcion}</p>
    </div>
  );
}

const botonEditar = (
  <Button size="sm" variant="outline">
    <Pencil /> Editar
  </Button>
);

/** Quita "https://www." para mostrar el enlace corto */
const enlaceCorto = (url: string | null) => (url ? url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") : null);

export default async function DatosIglesiaPage() {
  await requirePage(R.CONTENIDO);
  const [s, historia, personas] = await Promise.all([
    obtenerSitio(),
    prisma.webHistoria.findMany({ orderBy: [{ orden: "asc" }, { createdAt: "asc" }] }),
    prisma.webPersona.findMany({ orderBy: [{ orden: "asc" }, { createdAt: "asc" }] }),
  ]);
  const cifras = (Array.isArray(s.estadisticas) ? s.estadisticas : []) as Estadistica[];
  const horarios = parsearHorarios(s.horarios);
  const valores = (s.valores ?? "").split("\n").map((v) => v.trim()).filter(Boolean);
  const imgContacto = s.contactoImagenPath ? urlImagen({ imagenPath: s.contactoImagenPath, updatedAt: s.updatedAt }) : null;
  const imgLogin = s.loginImagenPath ? urlImagen({ imagenPath: s.loginImagenPath, updatedAt: s.updatedAt }) : null;
  const imgNosotros = s.nosotrosImagenPath ? urlImagen({ imagenPath: s.nosotrosImagenPath, updatedAt: s.updatedAt }) : null;
  const consultaMapa = [s.nombre, s.ciudad].filter(Boolean).join(", ");

  const revisar: [string, unknown][] = [
    ["Lema", s.lema],
    ["Teléfono", s.telefono],
    ["WhatsApp", s.whatsapp],
    ["Correo", s.correo],
    ["Dirección", s.direccion],
    ["Ciudad", s.ciudad],
    ["Horarios", s.horarios],
    ["Facebook", s.facebook],
    ["Instagram", s.instagram],
    ["YouTube", s.youtube],
    ["Misión", s.mision],
    ["Visión", s.vision],
    ["Valores", s.valores],
  ];
  const faltan = revisar.filter(([, v]) => !v).map(([k]) => k);
  const completos = revisar.length - faltan.length;
  const avance = completos / revisar.length;

  const redes = [
    { label: "Facebook", valor: s.facebook, icon: Facebook, color: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" },
    { label: "Instagram", valor: s.instagram, icon: Instagram, color: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300" },
    { label: "YouTube", valor: s.youtube, icon: Youtube, color: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" },
    { label: "TikTok", valor: s.tiktok, icon: Music2, color: "bg-zinc-200 text-zinc-800 dark:bg-zinc-500/20 dark:text-zinc-200" },
  ];

  return (
    <>
      <PageHeader
        title="Datos de la iglesia"
        description="Lo que ves aquí es lo que aparece en la página web. Edita cada bloque por separado; lo que dejes vacío no se muestra."
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

      {/* Identidad: nombre, lema, pie de página e imagen de Contáctanos */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-violet-700 via-indigo-700 to-blue-700 text-white shadow-sm">
        {imgContacto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgContacto} alt="" className="absolute inset-0 size-full object-cover opacity-25" />
        )}
        <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Image src="/images/logo.jpg" alt="" width={64} height={64} className="size-16 shrink-0 rounded-2xl object-cover ring-2 ring-white/40" />
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-widest text-white/70 uppercase">Identidad</p>
              <h2 className="text-2xl font-bold">{s.nombre}</h2>
              {s.lema ? <p className="text-white/85 italic">“{s.lema}”</p> : <p className="text-sm text-white/60">Sin lema</p>}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 40 40" className="size-12 -rotate-90" aria-hidden>
                <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/20" />
                <circle
                  cx="20"
                  cy="20"
                  r="17"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${avance * 106.8} 106.8`}
                  className="text-white"
                />
              </svg>
              <div className="leading-tight">
                <p className="text-lg font-bold">
                  {completos}/{revisar.length}
                </p>
                <p className="text-xs text-white/70">datos completos</p>
              </div>
            </div>
            <FormDialog
              title="Identidad de la iglesia"
              description="Aparece en el encabezado, el pie de página y Contáctanos."
              action={guardarContactoIglesia}
              successMessage="Identidad actualizada"
              trigger={
                <Button size="sm" variant="secondary">
                  <Pencil /> Editar
                </Button>
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nombre de la iglesia *" className="sm:col-span-2">
                  <Input name="nombre" defaultValue={s.nombre} required />
                </Field>
                <Field label="Lema" className="sm:col-span-2">
                  <Input name="lema" defaultValue={s.lema ?? ""} placeholder="Ej: Creciendo en número y en conocimiento" />
                </Field>
                <Field label="Texto del pie de página" className="sm:col-span-2">
                  <Textarea name="descripcion" rows={3} defaultValue={s.descripcion ?? ""} />
                </Field>
                <ImagenField actual={imgContacto} etiqueta="Imagen de fondo de Contáctanos" ayuda="Horizontal (ej. 1920×600). Sin imagen se usa el degradado azul-morado." />
              </div>
            </FormDialog>
          </div>
        </div>
        <div className="relative border-t border-white/15 bg-black/10 px-6 py-3 text-sm text-white/80">
          <span className="font-medium text-white">Pie de página: </span>
          {s.descripcion || <span className="italic text-white/60">sin texto</span>}
        </div>
      </section>

      {faltan.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            <strong>Sin completar:</strong> {faltan.join(", ")}. No es obligatorio: lo vacío simplemente no aparece en la página.
          </p>
        </div>
      )}

      <Seccion id="contacto" titulo="Contacto y ubicación" descripcion="Se muestra en Contáctanos, en el pie de página y en el botón de WhatsApp." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Tarjeta
          icon={Phone}
          titulo="Cómo comunicarse"
          accion={
            <FormDialog title="Cómo comunicarse" action={guardarContactoIglesia} successMessage="Datos de contacto actualizados" trigger={botonEditar}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Teléfono">
                  <Input name="telefono" type="tel" defaultValue={s.telefono ?? ""} placeholder="Ej: 301 483 9591" />
                </Field>
                <Field label="WhatsApp">
                  <Input name="whatsapp" type="tel" defaultValue={s.whatsapp ?? ""} placeholder="El botón abre el chat" />
                </Field>
                <Field label="Correo" className="sm:col-span-2">
                  <Input name="correo" type="email" defaultValue={s.correo ?? ""} placeholder="Ej: contacto@iccsantafe.com" />
                </Field>
                <Field label="Teléfono de emergencias pastorales" className="sm:col-span-2">
                  <Input name="emergencias" type="tel" defaultValue={s.emergencias ?? ""} placeholder="Vacío = no se muestra" />
                </Field>
              </div>
            </FormDialog>
          }
        >
          <div className="divide-y">
            <Dato icon={Phone} label="Teléfono" valor={s.telefono} color="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" />
            <Dato icon={MessageCircle} label="WhatsApp" valor={s.whatsapp} color="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" />
            <Dato icon={Mail} label="Correo" valor={s.correo} color="bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" />
            <Dato icon={Siren} label="Emergencias pastorales" valor={s.emergencias} color="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" />
          </div>
        </Tarjeta>

        <Tarjeta
          icon={MapPin}
          titulo="Ubicación"
          accion={
            <FormDialog title="Ubicación" action={guardarContactoIglesia} successMessage="Ubicación actualizada" trigger={botonEditar}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Dirección" className="sm:col-span-2">
                  <Input name="direccion" defaultValue={s.direccion ?? ""} placeholder="Ej: Carrera 43 #16-05 Barrio Santa Fe" />
                </Field>
                <Field label="Ciudad" className="sm:col-span-2">
                  <Input name="ciudad" defaultValue={s.ciudad ?? ""} placeholder="Ej: Santa Marta, Magdalena" />
                </Field>
                <Field label="Enlace de Google Maps (opcional)" className="sm:col-span-2">
                  <Input name="mapaUrl" defaultValue={s.mapaUrl ?? ""} placeholder="https://maps.app.goo.gl/…" />
                  <p className="text-muted-foreground text-xs">Para el botón “Cómo llegar”. Si lo dejas vacío, se busca la iglesia por su nombre y ciudad.</p>
                </Field>
              </div>
            </FormDialog>
          }
        >
          <div className="grid gap-3">
            <div>
              <p className="font-medium">{s.direccion || <span className="text-muted-foreground/70 italic">Sin dirección</span>}</p>
              <p className="text-muted-foreground text-sm">{s.ciudad || "Sin ciudad"}</p>
            </div>
            {consultaMapa && (
              <iframe
                title="Mapa de la iglesia"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(consultaMapa)}&z=16&hl=es&output=embed`}
                className="h-44 w-full rounded-lg border"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            )}
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Navigation className="size-3.5" />
              {s.mapaUrl ? "“Cómo llegar” usa tu enlace de Google Maps." : "“Cómo llegar” busca la iglesia por nombre y ciudad."}
            </p>
          </div>
        </Tarjeta>

        <Tarjeta
          icon={Clock}
          titulo="Horarios de servicio"
          accion={
            <FormDialog title="Horarios de servicio" action={guardarContactoIglesia} successMessage="Horarios actualizados" trigger={botonEditar}>
              <Field label="Horarios">
                <Textarea
                  name="horarios"
                  rows={10}
                  defaultValue={s.horarios ?? ""}
                  className="font-mono text-sm"
                  placeholder={"Domingos\n9:00 a. m. — Escuela dominical\n10:00 a. m. — Servicio principal\n\nMiércoles\n7:00 p. m. — Reunión de oración"}
                />
                <p className="text-muted-foreground text-xs">
                  Primera línea: el día. Debajo, un horario por línea. Deja una <strong>línea en blanco</strong> entre un día y otro.
                </p>
              </Field>
            </FormDialog>
          }
        >
          {horarios.length === 0 ? (
            <p className="text-muted-foreground/70 text-sm italic">Sin horarios · la sección no aparece</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {horarios.map((h) => (
                <div key={h.dia} className="rounded-lg border-l-4 border-violet-500 bg-violet-50/60 px-3 py-2 dark:bg-violet-500/10">
                  <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">{h.dia}</p>
                  {h.detalle.map((d) => (
                    <p key={d} className="text-muted-foreground text-sm">
                      {d}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </Tarjeta>

        <Tarjeta
          icon={Share2}
          titulo="Redes sociales"
          accion={
            <FormDialog title="Redes sociales" action={guardarContactoIglesia} successMessage="Redes actualizadas" trigger={botonEditar}>
              <div className="grid gap-4">
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
            </FormDialog>
          }
        >
          <div className="divide-y">
            {redes.map((r) => (
              <Dato key={r.label} icon={r.icon} label={r.label} valor={enlaceCorto(r.valor)} color={r.color} />
            ))}
          </div>
        </Tarjeta>
      </div>

      <Tarjeta
        icon={ImageIcon}
        titulo="Pantalla de inicio de sesión"
        accion={
          <FormDialog title="Imagen de inicio de sesión" description="Se ve a la derecha del formulario en computadores (en celular no aparece)." action={guardarImagenLogin} successMessage="Imagen de inicio de sesión actualizada" trigger={botonEditar}>
            <div className="grid gap-4 sm:grid-cols-2">
              <ImagenField actual={imgLogin} etiqueta="Imagen de inicio de sesión" ayuda="Vertical o cuadrada (ej. 1200×1400). Sin imagen se usa la foto actual de la congregación." />
            </div>
          </FormDialog>
        }
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* Miniatura: formulario a la izquierda, imagen a la derecha, como en /login */}
          <div className="grid h-32 w-full max-w-64 shrink-0 grid-cols-2 overflow-hidden rounded-lg border">
            <div className="bg-background flex flex-col justify-center gap-1.5 p-3">
              <span className="bg-muted h-2 w-3/4 rounded" />
              <span className="bg-muted h-3 rounded" />
              <span className="bg-muted h-3 rounded" />
              <span className="h-3 rounded bg-violet-500/70" />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgLogin ?? "/images/DSC00630.jpg"} alt="" className="size-full object-cover" />
          </div>
          <p className="text-muted-foreground text-sm">
            {imgLogin ? "Usando tu imagen." : "Usando la foto predeterminada de la congregación."} Aparece al lado del formulario en /login.
          </p>
        </div>
      </Tarjeta>

      <Seccion id="nosotros" titulo="Página Nosotros" descripcion="Encabezado, misión, visión, valores, cifras, historia y equipo pastoral." />

      {/* Encabezado tal como se ve en /nosotros */}
      <section className="relative overflow-hidden rounded-2xl border shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgNosotros ?? "/images/hero1.jpg"} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/20" />
        <div className="relative flex min-h-52 flex-col justify-end gap-2 p-6 text-white">
          <div className="absolute top-4 right-4">
            <FormDialog
              title="Encabezado de Nosotros"
              action={guardarNosotros}
              successMessage="Encabezado actualizado"
              trigger={
                <Button size="sm" variant="secondary">
                  <Pencil /> Editar encabezado
                </Button>
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Título principal" className="sm:col-span-2">
                  <Input name="nosotrosTitulo" defaultValue={s.nosotrosTitulo ?? ""} placeholder="Ej: Nuestra Historia, Nuestra Fe" />
                </Field>
                <Field label="Texto de bienvenida" className="sm:col-span-2">
                  <Textarea name="nosotrosTexto" rows={4} defaultValue={s.nosotrosTexto ?? ""} />
                </Field>
                <ImagenField actual={imgNosotros} etiqueta="Imagen de fondo" ayuda="Horizontal (ej. 1920×800). Sin imagen se usa la foto actual de la congregación." />
              </div>
            </FormDialog>
          </div>
          <p className="text-xs font-medium tracking-widest text-white/70 uppercase">Vista previa del encabezado</p>
          <h3 className="text-2xl font-bold md:text-3xl">{s.nosotrosTitulo || "Nuestra Historia, Nuestra Fe"}</h3>
          {s.nosotrosTexto && <p className="line-clamp-2 max-w-3xl text-sm text-white/85">{s.nosotrosTexto}</p>}
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        {(
          [
            { campo: "mision", titulo: "Misión", texto: s.mision, icon: Target },
            { campo: "vision", titulo: "Visión", texto: s.vision, icon: Eye },
          ] as const
        ).map((b) => (
          <Tarjeta
            key={b.campo}
            icon={b.icon}
            titulo={b.titulo}
            accion={
              <FormDialog title={b.titulo} action={guardarNosotros} successMessage={`${b.titulo} actualizada`} trigger={botonEditar}>
                <Field label={b.titulo}>
                  <Textarea name={b.campo} rows={6} defaultValue={b.texto ?? ""} />
                </Field>
              </FormDialog>
            }
          >
            {b.texto ? (
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">{b.texto}</p>
            ) : (
              <p className="text-muted-foreground/70 text-sm italic">Sin {b.titulo.toLowerCase()} · no se muestra</p>
            )}
          </Tarjeta>
        ))}
      </div>

      <Tarjeta
        icon={Heart}
        titulo="Valores"
        accion={
          <FormDialog title="Valores" action={guardarNosotros} successMessage="Valores actualizados" trigger={botonEditar}>
            <Field label="Valores (uno por línea)">
              <Textarea name="valores" rows={8} defaultValue={s.valores ?? ""} placeholder={"Amor\nFe\nServicio"} />
            </Field>
          </FormDialog>
        }
      >
        {valores.length === 0 ? (
          <p className="text-muted-foreground/70 text-sm italic">Sin valores · no se muestran</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {valores.map((v) => (
              <span key={v} className="rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-800 dark:bg-violet-500/15 dark:text-violet-200">
                {v}
              </span>
            ))}
          </div>
        )}
      </Tarjeta>

      <Panel>
        <FormInline action={guardarNosotros} successMessage="Cifras actualizadas">
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
