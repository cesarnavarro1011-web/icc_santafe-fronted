import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { ActionButton } from "@/components/workspace/action-button";
import { FormDialog } from "@/components/workspace/form-dialog";
import { Field, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { edad, ESTADO_CIVIL, fecha, isoDate, opciones } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { ROL_LABEL } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { actualizarPerfil, olvidarDispositivos, quitarFirma } from "./actions";
import { FirmaForm } from "./firma-form";
import { PasswordForm } from "./password-form";

function Dato({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-[10px] font-bold uppercase">{label}</dt>
      <dd className="bg-muted/50 mt-1 rounded-lg border px-3 py-2 text-sm">{valor || "—"}</dd>
    </div>
  );
}

export default async function PerfilPage() {
  const user = await requirePage();
  const u = await prisma.usuario.findUniqueOrThrow({
    where: { id: user.id },
    include: { fiel: true, dispositivos: { orderBy: { ultimoUso: "desc" } } },
  });
  const f = u.fiel;
  const firma = ["SUPERADMIN", "PASTOR", "SUPERVISOR", "MAESTRO"].includes(u.rol);
  const iniciales = `${f.nombre[0] ?? ""}${f.apellido[0] ?? ""}`.toUpperCase();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <PageHeader title="Perfil y seguridad" description="Tu información, tu firma y tu contraseña" />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5">
          <Panel>
            <div className="text-center">
              <div className="mx-auto mb-3 flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-2xl font-bold text-white">
                {iniciales}
              </div>
              <h2 className="font-bold">
                {f.nombre} {f.apellido}
              </h2>
              <p className="text-muted-foreground font-mono text-xs">{f.codigo}</p>
              <Badge variant="violet" className="mt-2">
                {ROL_LABEL[user.rol]}
              </Badge>
              <p className="text-muted-foreground mt-3 text-xs">Último acceso: {u.ultimoAcceso ? fecha(u.ultimoAcceso) : "—"}</p>
            </div>
          </Panel>
          {firma && (
            <Panel title="Firma digital" actions={u.firmaPath && (
              <ActionButton size="icon-sm" variant="ghost" aria-label="Quitar firma" confirm="¿Quitar tu firma?" successMessage="Firma eliminada" action={quitarFirma}>
                <Trash2 className="text-red-600" />
              </ActionButton>
            )}>
              {u.firmaPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/archivos/firma/${u.id}?v=${u.updatedAt.getTime()}`} alt="Tu firma" className="mb-3 max-h-20 rounded border bg-white p-1" />
              ) : (
                <p className="text-muted-foreground mb-3 text-sm">Aún no tienes firma. Se usa en los certificados que firmes.</p>
              )}
              <FirmaForm />
            </Panel>
          )}
        </div>

        <div className="space-y-5 lg:col-span-2">
          <Panel
            title="Información personal"
            actions={
              <FormDialog
                title="Editar mi información"
                description="El ID y el correo solo los puede cambiar el pastor."
                action={actualizarPerfil}
                successMessage="Perfil actualizado"
                trigger={
                  <Button size="sm" variant="outline">
                    <Pencil /> Editar
                  </Button>
                }
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nombre *">
                    <Input name="nombre" defaultValue={f.nombre} required />
                  </Field>
                  <Field label="Apellido *">
                    <Input name="apellido" defaultValue={f.apellido} required />
                  </Field>
                  <Field label="Celular / WhatsApp">
                    <Input name="celular" defaultValue={f.celular ?? ""} />
                  </Field>
                  <Field label="Fecha de nacimiento">
                    <Input name="fechaNacimiento" type="date" defaultValue={isoDate(f.fechaNacimiento)} />
                  </Field>
                  <Field label="Estado civil">
                    <NativeSelect name="estadoCivil" defaultValue={f.estadoCivil ?? ""}>
                      <option value="">—</option>
                      {opciones(ESTADO_CIVIL).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field label="Dirección">
                    <Input name="direccion" defaultValue={f.direccion ?? ""} />
                  </Field>
                </div>
              </FormDialog>
            }
          >
            <dl className="grid gap-4 sm:grid-cols-2">
              <Dato label="ID de fiel" valor={f.codigo} />
              <Dato label="Usuario" valor={u.usuario} />
              <Dato label="Correo" valor={f.correo} />
              <Dato label="Celular" valor={f.celular} />
              <Dato label="Dirección" valor={f.direccion} />
              <Dato label="Fecha de nacimiento" valor={f.fechaNacimiento ? `${fecha(f.fechaNacimiento)} (${edad(f.fechaNacimiento)})` : null} />
              <Dato label="Estado civil" valor={f.estadoCivil ? ESTADO_CIVIL[f.estadoCivil] : null} />
              <Dato label="Bautizado" valor={f.bautizado ? "Sí" : "No"} />
            </dl>
          </Panel>
          <Panel
            title="Verificación en dos pasos"
            actions={
              u.dispositivos.length > 0 && (
                <ActionButton
                  size="sm"
                  variant="outline"
                  confirm="En todos tus dispositivos se volverá a pedir el código de WhatsApp al iniciar sesión."
                  successMessage="Listo: se pedirá el código en tu próximo inicio de sesión"
                  action={olvidarDispositivos}
                >
                  Olvidar dispositivos
                </ActionButton>
              )
            }
          >
            <p className="text-muted-foreground text-sm">
              Al entrar desde un dispositivo nuevo, o cada 30 días, te enviamos un código por WhatsApp al{" "}
              <strong className="text-foreground">{f.celular ? `***${f.celular.replace(/\D/g, "").slice(-4)}` : "celular registrado"}</strong>.
              {!f.celular && " No tienes celular registrado: el código llegará a tu correo."}
            </p>
            {u.dispositivos.length > 0 && (
              <ul className="mt-3 divide-y rounded-lg border text-sm">
                {u.dispositivos.map((d) => (
                  <li key={d.id} className="flex items-center justify-between px-3 py-2">
                    <span>{d.nombre ?? "Navegador"}</span>
                    <span className="text-muted-foreground text-xs">Verificado {fecha(d.ultimaVerificacion)} · último uso {fecha(d.ultimoUso)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Cambiar contraseña">
            <PasswordForm />
            <p className="text-muted-foreground mt-3 text-xs">
              ¿Olvidaste tu contraseña? Cierra sesión y usa “Recuperar cuenta”: te enviaremos un código a tu correo.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
