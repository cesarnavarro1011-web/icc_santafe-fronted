"use client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react"; // Iconos ver/ocultar
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Identificador aleatorio de este navegador (para recordar dispositivos de confianza). */
function idDispositivo() {
  try {
    let id = localStorage.getItem("icc_dispositivo");
    if (!id) {
      id = crypto.randomUUID() + crypto.randomUUID().slice(0, 8);
      localStorage.setItem("icc_dispositivo", id);
    }
    return id;
  } catch {
    return "";
  }
}

interface LoginFormProps {
  setFormType: React.Dispatch<React.SetStateAction<"login" | "recovery">>;
}

// Igual que el sistema anterior: se entra con usuario o ID de fiel (F-...). También se acepta el correo.
const loginSchema = z.object({
  identificador: z.string().trim().min(1, "Ingresa tu usuario, ID o correo"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

type FormData = z.infer<typeof loginSchema>;

export function LoginForm({
  setFormType,
  className,
  ...props
}: LoginFormProps & React.ComponentPropsWithoutRef<"form">) {
  const {
    handleSubmit,
    register,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);

  // Verificación en dos pasos: el servidor responde "2FA:<canal>:<destino>" y se abre el modal
  const [credenciales, setCredenciales] = useState<FormData | null>(null);
  const [verificacion, setVerificacion] = useState<{ canal: string; destino: string } | null>(null);
  const [codigo, setCodigo] = useState("");
  const [errorCodigo, setErrorCodigo] = useState("");
  const [verificando, setVerificando] = useState(false);

  const entrar = useCallback(() => {
    setSuccess(true);
    setVerificacion(null);
    const destino = searchParams.get("callbackUrl");
    // Solo rutas internas: "//otro-sitio.com" o "/\otro" llevarían fuera de la aplicación
    const interna = destino && destino.startsWith("/") && !destino.startsWith("//") && !destino.startsWith("/\\");
    router.push(interna ? destino : "/workspace");
    router.refresh();
  }, [router, searchParams]);

  const intentar = useCallback(
    async (data: FormData, codigoIngresado?: string) =>
      signIn("credentials", { ...data, codigo: codigoIngresado ?? "", dispositivo: idDispositivo(), redirect: false }),
    [],
  );

  const onSubmit = useCallback(
    async (data: FormData) => {
      setLoading(true);
      setErrorMessage("");
      setSuccess(false);
      const res = await intentar(data);
      setLoading(false);
      if (res?.error?.startsWith("2FA:")) {
        const [, canal, destino] = res.error.split(":");
        setCredenciales(data);
        setCodigo("");
        setErrorCodigo("");
        setVerificacion({ canal, destino });
        return;
      }
      if (!res || res.error) {
        setErrorMessage(res?.error === "CredentialsSignin" ? "Credenciales incorrectas" : res?.error || "Error al iniciar sesión");
        return;
      }
      entrar();
    },
    [intentar, entrar]
  );

  async function verificarCodigo(e: React.FormEvent) {
    e.preventDefault();
    if (!credenciales || codigo.length !== 6) return;
    setVerificando(true);
    setErrorCodigo("");
    const res = await intentar(credenciales, codigo);
    setVerificando(false);
    if (!res || res.error) {
      setErrorCodigo(res?.error === "2FA_INVALIDO" ? "Código incorrecto o vencido." : res?.error || "No se pudo verificar.");
      return;
    }
    entrar();
  }

  async function reenviar() {
    if (!credenciales) return;
    setVerificando(true);
    setErrorCodigo("");
    const res = await intentar(credenciales);
    setVerificando(false);
    if (res?.error?.startsWith("2FA:")) {
      const [, canal, destino] = res.error.split(":");
      setVerificacion({ canal, destino });
      setCodigo("");
      setErrorCodigo("Te enviamos un código nuevo.");
    } else if (res?.error) setErrorCodigo(res.error);
  }

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit(onSubmit)}
      {...props}
      noValidate
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Inicia sesión</h1>
        <p className="text-sm text-muted-foreground">
          Ingresa con tu usuario, número de documento o correo.
        </p>
      </div>

      {errorMessage && <p className="text-red-500 text-sm text-center">{errorMessage}</p>}

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="identificador">Usuario o documento</Label>
          <Input
            id="identificador"
            type="text"
            placeholder="1004355591 o mi_usuario"
            autoComplete="username"
            aria-invalid={!!errors.identificador}
            {...register("identificador")}
            className={cn(
              errors.identificador ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
            )}
          />
          {errors.identificador && <p className="text-red-500 text-xs">{errors.identificador.message}</p>}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Contraseña</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...register("password")}
              className={cn(
                "pr-10",
                errors.password ? "border-red-500" : ""
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
        </div>

        <Button
          type="submit"
            className={`w-full transition-colors ${success ? "bg-emerald-800" : "bg-black hover:bg-gray-900"}`}
          disabled={loading || success || !isValid}
          style={{ opacity: success ? 0.9 : 1 }}
        >
          {loading ? "Iniciando..." : success ? "Sesión iniciada" : "Iniciar sesión"}
        </Button>
      </div>

      <div className="text-center text-sm">
        ¿Olvidaste tu contraseña?{" "}
        <button type="button" onClick={() => setFormType("recovery")} className="underline">
          Recuperar cuenta
        </button>
      </div>

      <Dialog open={!!verificacion} onOpenChange={(o) => !o && setVerificacion(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="items-center text-center sm:text-center">
            <span className="mb-1 flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <ShieldCheck className="size-6" />
            </span>
            <DialogTitle>Verifica que eres tú</DialogTitle>
            <DialogDescription className="text-center">
              Te enviamos un código de 6 dígitos por <strong>{verificacion?.canal}</strong> al <strong>{verificacion?.destino}</strong>. Vence en 5 minutos.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={verificarCodigo} className="grid gap-3">
            <Input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="000000"
              className="h-12 text-center font-mono text-2xl tracking-[0.5em]"
            />
            {errorCodigo && <p className={cn("text-center text-xs", errorCodigo.startsWith("Te enviamos") ? "text-emerald-600" : "text-red-500")}>{errorCodigo}</p>}
            <Button type="submit" disabled={codigo.length !== 6 || verificando}>
              {verificando ? "Verificando..." : "Verificar y entrar"}
            </Button>
            <button type="button" onClick={reenviar} disabled={verificando} className="text-muted-foreground text-xs underline">
              ¿No te llegó? Reenviar código
            </button>
            <p className="text-muted-foreground text-center text-[11px]">No te lo volveremos a pedir en este dispositivo durante 30 días.</p>
          </form>
        </DialogContent>
      </Dialog>
    </form>
  );
}
