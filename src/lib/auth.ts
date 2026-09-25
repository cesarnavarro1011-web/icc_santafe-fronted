import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { HASH_FALSO, hashPassword, verifyPassword } from "@/lib/server/password";
import { buscarUsuarioPor } from "@/lib/server/identificador";
import { confiarDispositivo, enviarCodigoLogin, necesitaVerificacion, verificarCodigoLogin } from "@/server/dos-pasos";
import { ipDe, limpiarIntentos, minutosBloqueo, registrarIntento, REGLAS } from "@/lib/server/rate-limit";

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
        codigo: { label: "Código de verificación", type: "text" },
        dispositivo: { label: "Dispositivo", type: "text" },
      },
      async authorize(credentials, req) {
        const identificador = credentials?.identificador?.trim();
        const password = credentials?.password ?? "";
        if (!identificador || !password || identificador.length > 120 || password.length > 200) return null;

        // Fuerza bruta: se bloquea por usuario y por IP tras varios intentos fallidos
        const claveUsuario = `login:u:${identificador.toLowerCase()}`;
        const claveIp = `login:ip:${ipDe(req?.headers)}`;
        const espera = Math.max(minutosBloqueo(claveUsuario), minutosBloqueo(claveIp));
        if (espera) throw new Error(`Demasiados intentos fallidos. Intenta de nuevo en ${espera} min.`);
        const fallo = () => {
          registrarIntento(claveUsuario, REGLAS.loginUsuario);
          registrarIntento(claveIp, REGLAS.loginIp);
          return null;
        };

        // Igual que el sistema anterior: se puede entrar con usuario o con el ID de fiel.
        // Se agrega el correo como tercera opción.
        const usuario = await prisma.usuario.findFirst({
          where: buscarUsuarioPor(identificador),
          include: { fiel: { select: { nombre: true, celular: true, correo: true } } },
        });
        if (!usuario) {
          await verifyPassword(password, HASH_FALSO); // mismo tiempo de respuesta exista o no el usuario
          return fallo();
        }

        const { ok, needsRehash } = await verifyPassword(password, usuario.passwordHash);
        if (!ok) return fallo();
        if (!usuario.activo) throw new Error("Tu cuenta está inactiva.");
        limpiarIntentos(claveUsuario);

        // Verificación en dos pasos solo en dispositivos nuevos o cada 30 días
        const dispositivo = credentials?.dispositivo;
        if (await necesitaVerificacion(usuario.id, dispositivo)) {
          const codigo = credentials?.codigo?.trim();
          if (!codigo) {
            const envio = await enviarCodigoLogin(usuario);
            // El cliente lee este mensaje y abre el modal para escribir el código
            if (envio) throw new Error(`2FA:${envio.canal}:${envio.destino}`);
            console.warn(`[2fa] ${usuario.usuario} no tiene celular ni correo: entra sin verificación en dos pasos.`);
          } else {
            if (!(await verificarCodigoLogin(usuario.id, codigo))) throw new Error("2FA_INVALIDO");
            const ua = req?.headers?.["user-agent"];
            await confiarDispositivo(usuario.id, dispositivo, Array.isArray(ua) ? ua[0] : ua);
          }
        }

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
