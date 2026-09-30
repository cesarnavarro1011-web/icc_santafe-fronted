import { ArrowLeft, Download, Eye } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormInline } from "@/components/workspace/form-inline";
import { Field, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { NOMBRE_IGLESIA } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { CERT_DEFECTO, obtenerPlantillaCertificado } from "@/server/certificados";
import { codigoEjemplo, PREFIJO_DEFECTO } from "@/server/codigo-certificado";
import { guardarPlantillaCertificado } from "./actions";

function CampoImagen({ nombre, etiqueta, actual, defecto, ayuda }: { nombre: "logo" | "sello"; etiqueta: string; actual: string | null; defecto?: string; ayuda: string }) {
  const quitar = nombre === "logo" ? "quitarLogo" : "quitarSello";
  const vista = actual ?? defecto;
  return (
    <Field label={etiqueta}>
      <div className="flex items-center gap-3">
        <span className="bg-muted/50 flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
          {vista ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vista} alt="" className="size-full object-contain" />
          ) : (
            <span className="text-muted-foreground text-[10px]">Sin imagen</span>
          )}
        </span>
        <div className="grid min-w-0 flex-1 gap-1.5">
          <Input name={nombre} type="file" accept="image/png,image/jpeg" />
          {actual && (
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" name={quitar} className="size-3.5 accent-red-600" /> Quitar {nombre === "logo" ? "(vuelve el logo de la iglesia)" : "sello"}
            </label>
          )}
        </div>
      </div>
      <p className="text-muted-foreground text-xs">{ayuda}</p>
    </Field>
  );
}

export default async function PlantillaCertificadoPage() {
  await requirePage(R.ADMIN);
  const [p, sitio] = await Promise.all([obtenerPlantillaCertificado(), prisma.webSitio.findUnique({ where: { id: "principal" } })]);
  const v = p.updatedAt.getTime();
  const url = (tipo: string) => `/api/archivos/plantilla-cert/${tipo}?v=${v}`;

  return (
    <>
      <PageHeader
        title="Plantilla de certificado"
        description="Así se genera el diploma cuando el estudiante termina el curso y el pastor da la firma final. Lo que dejes vacío usa el texto por defecto."
        actions={
          <Button variant="outline" asChild>
            <Link href="/workspace/certificados">
              <ArrowLeft /> Certificados
            </Link>
          </Button>
        }
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Panel>
          <FormInline action={guardarPlantillaCertificado} successMessage="Plantilla guardada. La vista previa ya muestra los cambios.">
            <p className="text-muted-foreground text-xs font-semibold uppercase">Encabezado</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoImagen nombre="logo" etiqueta="Logo" actual={p.logoPath ? url("logo") : null} defecto="/images/logo.jpg" ayuda="PNG (mejor con fondo transparente) o JPG, máx. 3 MB." />
              <CampoImagen nombre="sello" etiqueta="Sello oficial" actual={p.selloPath ? url("sello") : null} ayuda="PNG con fondo transparente. Va entre la firma del supervisor y la del pastor." />
              <Field label="Institución" className="sm:col-span-2">
                <Input name="institucion" defaultValue={p.institucion ?? ""} placeholder={sitio?.nombre || NOMBRE_IGLESIA} />
              </Field>
              <Field label="Subtítulo" className="sm:col-span-2">
                <Input name="subtitulo" defaultValue={p.subtitulo ?? ""} placeholder={CERT_DEFECTO.subtitulo} />
              </Field>
              <Field label="Título" className="sm:col-span-2">
                <Input name="titulo" defaultValue={p.titulo ?? ""} placeholder={CERT_DEFECTO.titulo} />
              </Field>
            </div>

            <p className="text-muted-foreground border-t pt-4 text-xs font-semibold uppercase">Textos</p>
            <div className="grid gap-4">
              <Field label="Texto antes del nombre del estudiante">
                <Textarea name="textoIntro" rows={2} defaultValue={p.textoIntro ?? ""} placeholder={CERT_DEFECTO.textoIntro} />
              </Field>
              <Field label="Texto antes del nombre del curso">
                <Textarea name="textoPrograma" rows={2} defaultValue={p.textoPrograma ?? ""} placeholder={CERT_DEFECTO.textoPrograma} />
              </Field>
              <p className="text-muted-foreground -mt-2 text-xs">El nombre del estudiante, el curso, la fecha y el código se llenan solos.</p>
            </div>

            <p className="text-muted-foreground border-t pt-4 text-xs font-semibold uppercase">Versículo</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="flex items-center gap-2 text-sm sm:col-span-3">
                <input type="checkbox" name="mostrarVersiculo" defaultChecked={p.mostrarVersiculo} className="size-4 accent-violet-600" /> Mostrar versículo
              </label>
              <Field label="Texto" className="sm:col-span-2">
                <Textarea name="versiculo" rows={3} defaultValue={p.versiculo ?? ""} placeholder={CERT_DEFECTO.versiculo} />
              </Field>
              <Field label="Cita">
                <Input name="versiculoCita" defaultValue={p.versiculoCita ?? ""} placeholder={CERT_DEFECTO.versiculoCita} />
              </Field>
            </div>

            <p className="text-muted-foreground border-t pt-4 text-xs font-semibold uppercase">Firmas</p>
            <p className="text-muted-foreground -mt-2 text-xs">
              Firman el profesor, el supervisor y el pastor que aprobaron el certificado, con la firma digital que cada uno sube en su Perfil. Aquí
              eliges el cargo que aparece debajo de cada nombre.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Cargo del profesor">
                <Input name="cargoMaestro" defaultValue={p.cargoMaestro ?? ""} placeholder={CERT_DEFECTO.cargoMaestro} />
              </Field>
              <Field label="Cargo del supervisor">
                <Input name="cargoSupervisor" defaultValue={p.cargoSupervisor ?? ""} placeholder={CERT_DEFECTO.cargoSupervisor} />
              </Field>
              <Field label="Cargo del pastor">
                <Input name="cargoPastor" defaultValue={p.cargoPastor ?? ""} placeholder={CERT_DEFECTO.cargoPastor} />
              </Field>
            </div>

            <p className="text-muted-foreground border-t pt-4 text-xs font-semibold uppercase">Pie y código de registro</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Lugar">
                <Input name="lugar" defaultValue={p.lugar ?? ""} placeholder={sitio?.ciudad ? `${sitio.ciudad}, Colombia` : "Ciudad, país"} />
              </Field>
              <Field label="Prefijo del código">
                <Input name="prefijoCodigo" defaultValue={p.prefijoCodigo ?? ""} placeholder={PREFIJO_DEFECTO} maxLength={10} className="font-mono uppercase" />
              </Field>
            </div>
            <p className="text-muted-foreground -mt-2 text-xs">
              Formato: prefijo, año, consecutivo (se reinicia cada año) y 2 caracteres de verificación. Ejemplo:{" "}
              <span className="text-foreground font-mono">{codigoEjemplo(p.prefijoCodigo)}</span>. El código se asigna con la firma del pastor y el QR
              del certificado abre la página pública de verificación.
            </p>
          </FormInline>
        </Panel>

        <Panel
          className="xl:sticky xl:top-4"
          title={
            <span className="flex items-center gap-2">
              <Eye className="size-4 text-violet-500" /> Vista previa
            </span>
          }
          actions={
            <Button size="sm" variant="outline" asChild>
              <a href={`/api/certificados/vista-previa?v=${v}`} target="_blank" rel="noreferrer">
                <Download /> Abrir PDF
              </a>
            </Button>
          }
        >
          <iframe
            key={v}
            title="Vista previa del certificado"
            src={`/api/certificados/vista-previa?v=${v}#toolbar=0&navpanes=0&view=Fit`}
            className="aspect-[842/595] w-full rounded-lg border bg-white"
          />
          <p className="text-muted-foreground mt-2 text-xs">Ejemplo con datos ficticios. Los certificados ya emitidos conservan el diseño con el que se generaron.</p>
        </Panel>
      </div>
    </>
  );
}
