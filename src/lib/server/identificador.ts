import "server-only";
import type { Prisma } from "@prisma/client";

/**
 * Filtro para encontrar un usuario por lo que escriba al iniciar sesión:
 *   - su usuario:           "nando.rincon"
 *   - su ID de fiel:        "F-1004355591" (sin importar mayúsculas)
 *   - solo el documento:    "1004355591"   → se busca como "F-1004355591"
 *   - su correo:            "nando@correo.com"
 */
export function buscarUsuarioPor(identificador: string): Prisma.UsuarioWhereInput {
  const id = identificador.trim();
  const soloDigitos = id.replace(/[\s.]/g, ""); // tolera "1.004.355.591"
  const codigos = [id];
  if (/^\d+$/.test(soloDigitos)) codigos.push(`F-${soloDigitos}`);

  return {
    OR: [
      { usuario: { equals: id, mode: "insensitive" } },
      ...codigos.map((codigo) => ({ fiel: { codigo: { equals: codigo, mode: "insensitive" as const } } })),
      { fiel: { correo: { equals: id, mode: "insensitive" } } },
    ],
  };
}
