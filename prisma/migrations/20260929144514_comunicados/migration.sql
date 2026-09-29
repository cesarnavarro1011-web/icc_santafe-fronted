-- CreateEnum
CREATE TYPE "EstadoComunicado" AS ENUM ('BORRADOR', 'ENVIANDO', 'ENVIADO');

-- CreateEnum
CREATE TYPE "CanalEnvio" AS ENUM ('CORREO', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "EstadoEnvio" AS ENUM ('PENDIENTE', 'ENVIADO', 'FALLIDO', 'OMITIDO');

-- AlterTable
ALTER TABLE "Fiel" ADD COLUMN     "recibeInformativos" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Comunicado" (
    "id" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "imagenes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enlaceUrl" TEXT,
    "enlaceTexto" TEXT,
    "porCorreo" BOOLEAN NOT NULL DEFAULT true,
    "porWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "destinatarios" JSONB NOT NULL DEFAULT '{"tipo":"todos"}',
    "estado" "EstadoComunicado" NOT NULL DEFAULT 'BORRADOR',
    "total" INTEGER NOT NULL DEFAULT 0,
    "enviados" INTEGER NOT NULL DEFAULT 0,
    "fallidos" INTEGER NOT NULL DEFAULT 0,
    "omitidos" INTEGER NOT NULL DEFAULT 0,
    "creadoPorId" TEXT,
    "enviadoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comunicado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvioComunicado" (
    "id" TEXT NOT NULL,
    "comunicadoId" TEXT NOT NULL,
    "fielId" TEXT NOT NULL,
    "canal" "CanalEnvio" NOT NULL,
    "destino" TEXT,
    "estado" "EstadoEnvio" NOT NULL DEFAULT 'PENDIENTE',
    "error" TEXT,
    "enviadoAt" TIMESTAMP(3),

    CONSTRAINT "EnvioComunicado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnvioComunicado_comunicadoId_estado_idx" ON "EnvioComunicado"("comunicadoId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "EnvioComunicado_comunicadoId_fielId_canal_key" ON "EnvioComunicado"("comunicadoId", "fielId", "canal");

-- AddForeignKey
ALTER TABLE "EnvioComunicado" ADD CONSTRAINT "EnvioComunicado_comunicadoId_fkey" FOREIGN KEY ("comunicadoId") REFERENCES "Comunicado"("id") ON DELETE CASCADE ON UPDATE CASCADE;
