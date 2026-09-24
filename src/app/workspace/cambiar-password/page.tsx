import { KeyRound } from "lucide-react";
import { Panel } from "@/components/workspace/ui-kit";
import { requirePage } from "@/lib/server/session";
import { PasswordForm } from "../perfil/password-form";

export default async function CambiarPasswordPage() {
  const user = await requirePage();
  return (
    <div className="mx-auto w-full max-w-lg space-y-4 pt-6">
      <div className="text-center">
        <KeyRound className="mx-auto mb-2 size-10 text-violet-600" />
        <h1 className="text-2xl font-bold">Cambia tu contraseña</h1>
        <p className="text-muted-foreground text-sm">
          {user.debeCambiarPassword
            ? "Por seguridad debes cambiar tu contraseña temporal antes de continuar."
            : "Tu contraseña ya fue actualizada."}
        </p>
      </div>
      <Panel>
        <PasswordForm redirigirA="/workspace" />
      </Panel>
    </div>
  );
}
