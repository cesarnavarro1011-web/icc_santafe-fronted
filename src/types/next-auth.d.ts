import type { RolUsuario } from "@/lib/roles";

type DatosUsuarioSesion = {
  id: string;
  fielId: string;
  codigo: string;
  usuario: string;
  name: string;
  email: string | null;
  rol: RolUsuario;
  debeCambiarPassword: boolean;
  /** true si el usuario fue desactivado o eliminado después de iniciar sesión */
  inactivo?: boolean;
};

declare module "next-auth" {
  interface Session {
    user: DatosUsuarioSesion;
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface User extends DatosUsuarioSesion {}
}

declare module "next-auth/jwt" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface JWT extends DatosUsuarioSesion {}
}
