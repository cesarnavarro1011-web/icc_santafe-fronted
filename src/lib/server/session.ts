import "server-only";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { tieneRol, type RolUsuario } from "@/lib/roles";

export type UsuarioSesion = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.inactivo) return null;
  return session.user;
}

/** Para páginas (server components): redirige si no hay sesión o no tiene el rol. */
export async function requirePage(roles?: readonly RolUsuario[]) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (roles && !tieneRol(user.rol, roles)) redirect("/workspace?denegado=1");
  return user;
}

import { AuthError } from "./errors";
export { AuthError };

/** Para server actions y route handlers: lanza error si no hay permiso. */
export async function requireUser(roles?: readonly RolUsuario[]) {
  const user = await getSessionUser();
  if (!user) throw new AuthError("Tu sesión expiró. Vuelve a iniciar sesión.");
  if (roles && !tieneRol(user.rol, roles)) throw new AuthError("No tienes permiso para esta acción.");
  return user;
}
