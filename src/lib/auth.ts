import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/server/password";
import { buscarUsuarioPor } from "@/lib/server/identificador";
import type { RolUsuario } from "@/lib/roles";

const SESION_HORAS = 8;

async function datosSesion(usuarioId: string) {
  const u = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: { fiel: true },
  });
  if (!u || !u.activo) return null;
  return {
    id: u.id,
    fielId: u.fielId,
    codigo: u.fiel.codigo,
    usuario: u.usuario,
    name: `${u.fiel.nombre} ${u.fiel.apellido}`.trim(),
    email: u.fiel.correo,
    rol: u.rol as RolUsuario,
    debeCambiarPassword: u.debeCambiarPassword,
  };
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: SESION_HORAS * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        identificador: { label: "Usuario, ID o correo", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const identificador = credentials?.identificador?.trim();
        const password = credentials?.password ?? "";
        if (!identificador || !password) return null;

        // Igual que el sistema anterior: se puede entrar con usuario o con el ID de fiel.
        // Se agrega el correo como tercera opción.
        const usuario = await prisma.usuario.findFirst({
          where: buscarUsuarioPor(identificador),
        });
        if (!usuario) return null;

        const { ok, needsRehash } = await verifyPassword(password, usuario.passwordHash);
        if (!ok) return null;
        if (!usuario.activo) throw new Error("Tu cuenta está inactiva.");

        await prisma.usuario.update({
          where: { id: usuario.id },
          data: {
            ultimoAcceso: new Date(),
            ...(needsRehash ? { passwordHash: await hashPassword(password) } : {}),
          },
        });

        return datosSesion(usuario.id);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        Object.assign(token, user);
        return token;
      }
      // Se relee el usuario en cada petición del servidor: un cambio de rol, una
      // desactivación o el cambio de contraseña temporal aplican de inmediato.
      if (token.id) {
        const fresh = await datosSesion(token.id);
        if (fresh) Object.assign(token, fresh, { inactivo: false });
        else token.inactivo = true;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        fielId: token.fielId,
        codigo: token.codigo,
        usuario: token.usuario,
        name: token.name ?? "",
        email: token.email ?? null,
        rol: token.rol,
        debeCambiarPassword: token.debeCambiarPassword,
        inactivo: token.inactivo,
      };
      return session;
    },
  },
};
