import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { isAxiosError } from "axios";
import { toast } from "@/components/workspace/aviso";

type Step = "request" | "verify" | "reset" | "done";

const requestSchema = z.object({
  identifier: z.string().min(1, "Ingrese correo o número de identidad"),
});
type RequestData = z.infer<typeof requestSchema>;

const verifySchema = z.object({
  identifier: z.string().min(1),
  code: z.string().length(6, "El código debe tener 6 caracteres"),
});
type VerifyData = z.infer<typeof verifySchema>;

const resetSchema = z
  .object({
    identifier: z.string().min(1),
    code: z.string().length(6),
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Za-z]/, "Debe incluir letras")
      .regex(/\d/, "Debe incluir números"),
    confirmPassword: z.string().min(1, "Confirme la contraseña"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });
type ResetData = z.infer<typeof resetSchema>;

function mensajeError(e: unknown, porDefecto: string): string {
  return (isAxiosError(e) && e.response?.data?.message) || porDefecto;
}

interface RecoveryFormProps {
  setFormType: React.Dispatch<React.SetStateAction<"login" | "recovery">>;
}

export function RecoveryForm({
  setFormType,
  className,
  ...props
}: RecoveryFormProps & React.ComponentPropsWithoutRef<"div">) {
  const [step, setStep] = useState<Step>("request");
  const [loading, setLoading] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Formulario: Paso 1
  const requestForm = useForm<RequestData>({
    resolver: zodResolver(requestSchema),
  });

  // Formulario: Paso 2
  const verifyForm = useForm<VerifyData>({
    resolver: zodResolver(verifySchema),
    defaultValues: { identifier, code },
  });

  // Formulario: Paso 3
  const resetForm = useForm<ResetData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { identifier, code },
  });

  const handleRequest = async (data: RequestData) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await axios.post("/api/auth/recovery/request", {
        identifier: data.identifier,
      });
      setIdentifier(data.identifier);
      setStep("verify");
      toast.success("Solicitud recibida", {
        description: "Si el usuario tiene correo registrado, le llegará un código.",
      });
    } catch (e) {
      setErrorMessage(mensajeError(e, "Error al solicitar recuperación"));
      toast.error("Error", { description: "Intente nuevamente." });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (data: VerifyData) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await axios.post("/api/auth/recovery/verify", {
        identifier: data.identifier,
        code: data.code,
      });
      setCode(data.code);
      setStep("reset");
      toast.success("Código verificado", {
        description: "Ahora establece tu nueva contraseña.",
      });
    } catch (e) {
      setErrorMessage(mensajeError(e, "Código inválido"));
      toast.error("Error", { description: "Código incorrecto." });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (data: ResetData) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await axios.post("/api/auth/recovery/reset", {
        identifier: data.identifier,
        code: data.code,
        password: data.password,
      });
      setStep("done");
      toast.success("Contraseña actualizada", {
        description: "Inicie sesión con su nueva contraseña.",
      });
      setFormType("login");
    } catch (e) {
      setErrorMessage(mensajeError(e, "Error al actualizar contraseña"));
      toast.error("Error", { description: "Intente nuevamente." });
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setLoading(true);
    try {
      await axios.post("/api/auth/recovery/resend", { identifier });
      toast.success("Código reenviado");
    } catch {
      toast.error("No se pudo reenviar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">
          {step === "request" && "Recupera tu cuenta"}
          {step === "verify" && "Verifica tu código"}
          {step === "reset" && "Nueva contraseña"}
          {step === "done" && "Proceso completado"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {step === "request" && "Ingresa tu correo o número de identidad."}
          {step === "verify" && "Si el usuario tiene correo registrado, le enviamos un código de 6 dígitos. Revisa tu bandeja y el spam."}
          {step === "reset" && "Ingresa y confirma tu nueva contraseña."}
          {step === "done" && "Ya puedes iniciar sesión."}
        </p>
      </div>

      {errorMessage && (
        <p className="text-red-500 text-sm text-center">{errorMessage}</p>
      )}

      {step === "request" && (
        <form
          onSubmit={requestForm.handleSubmit(handleRequest)}
          className="grid gap-5"
        >
          <div className="grid gap-2">
            <Label htmlFor="identifier">Correo o Identidad</Label>
            <Input
              id="identifier"
              placeholder="correo@ejemplo.com o número"
              {...requestForm.register("identifier")}
              className={
                requestForm.formState.errors.identifier ? "border-red-500" : ""
              }
            />
            {requestForm.formState.errors.identifier && (
              <p className="text-red-500 text-sm">
                {requestForm.formState.errors.identifier.message}
              </p>
            )}
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Enviando..." : "Enviar código"}
          </Button>
        </form>
      )}

      {step === "verify" && (
        <form
          onSubmit={verifyForm.handleSubmit(handleVerify)}
          className="grid gap-5"
        >
          <div className="grid gap-2">
            <Label htmlFor="code">Código de verificación</Label>
            <Input
              id="code"
              maxLength={6}
              placeholder="******"
              {...verifyForm.register("code")}
              className={verifyForm.formState.errors.code ? "border-red-500" : ""}
            />
            {verifyForm.formState.errors.code && (
              <p className="text-red-500 text-sm">
                {verifyForm.formState.errors.code.message}
              </p>
            )}
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Validando..." : "Validar código"}
          </Button>
          <button
            type="button"
            onClick={resendCode}
            className="text-xs underline underline-offset-4 self-start"
            disabled={loading}
          >
            Reenviar código
          </button>
        </form>
      )}

      {step === "reset" && (
        <form
          onSubmit={resetForm.handleSubmit(handleReset)}
          className="grid gap-5"
        >
          <div className="grid gap-2">
            <Label htmlFor="password">Nueva contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="********"
              {...resetForm.register("password")}
              className={
                resetForm.formState.errors.password ? "border-red-500" : ""
              }
            />
            {resetForm.formState.errors.password && (
              <p className="text-red-500 text-sm">
                {resetForm.formState.errors.password.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="********"
              {...resetForm.register("confirmPassword")}
              className={
                resetForm.formState.errors.confirmPassword
                  ? "border-red-500"
                  : ""
              }
            />
            {resetForm.formState.errors.confirmPassword && (
              <p className="text-red-500 text-sm">
                {resetForm.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Guardar contraseña"}
          </Button>
        </form>
      )}

      {step === "done" && (
        <div className="flex flex-col gap-4">
          <Button onClick={() => setFormType("login")}>Ir a iniciar sesión</Button>
        </div>
      )}

      <div className="text-center text-sm">
        ¿Ya tienes una cuenta?{" "}
        <button
            type="button"
          onClick={() => setFormType("login")}
          className="underline underline-offset-4"
        >
          Inicia sesión
        </button>
      </div>
    </div>
  );
}
