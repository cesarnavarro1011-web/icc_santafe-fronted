/**
 * Crea (o actualiza) un usuario SUPERADMIN para entrar la primera vez.
 *
 *   npm run db:superadmin -- --usuario admin --password "MiClave123" --nombre Cesar --apellido Navarro --correo tu@correo.com [--documento 1004...]
 *
 * Si el fiel ya existe (mismo documento/ID), solo se le asigna el acceso de superadmin.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function arg(nombre: string) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const usuario = arg("usuario") ?? "admin";
  const password = arg("password");
  const nombre = arg("nombre") ?? "Administrador";
  const apellido = arg("apellido") ?? "Sistema";
  const correo = arg("correo")?.toLowerCase() ?? null;
  const documento = arg("documento")?.replace(/\D/g, "");
  if (!password || password.length < 6) {
    console.error('Falta --password (mínimo 6 caracteres). Ej: npm run db:superadmin -- --usuario admin --password "MiClave123"');
    process.exit(1);
  }

  const codigo = documento ? `F-${documento}` : "F-ADMIN";
  const fiel = await prisma.fiel.upsert({
    where: { codigo },
    create: { codigo, nombre, apellido, correo },
    update: {},
  });
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.usuario.upsert({
    where: { fielId: fiel.id },
    create: { fielId: fiel.id, usuario, passwordHash, rol: "SUPERADMIN", debeCambiarPassword: false },
    update: { usuario, passwordHash, rol: "SUPERADMIN", activo: true, debeCambiarPassword: false },
  });
  console.log(`✓ Superadmin listo. Entra con "${usuario}" o "${codigo}" y tu contraseña.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
