-- AlterEnum
ALTER TYPE "PropositoOtp" ADD VALUE 'LOGIN_2FA';

-- CreateTable
CREATE TABLE "DispositivoConfiable" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "nombre" TEXT,
    "ultimaVerificacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoUso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DispositivoConfiable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DispositivoConfiable_usuarioId_tokenHash_key" ON "DispositivoConfiable"("usuarioId", "tokenHash");

-- AddForeignKey
ALTER TABLE "DispositivoConfiable" ADD CONSTRAINT "DispositivoConfiable_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
