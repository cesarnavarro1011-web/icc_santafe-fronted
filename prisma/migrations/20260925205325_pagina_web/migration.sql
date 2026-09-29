-- CreateEnum
CREATE TYPE "EstadoPublicacion" AS ENUM ('BORRADOR', 'PUBLICADO');

-- CreateEnum
CREATE TYPE "EstadoPeticion" AS ENUM ('NUEVA', 'EN_ORACION', 'RESPONDIDA', 'ARCHIVADA');

-- AlterEnum
ALTER TYPE "Rol" ADD VALUE 'EDITOR';

-- CreateTable
CREATE TABLE "WebSlide" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "subtitulo" TEXT,
    "descripcion" TEXT,
    "imagenPath" TEXT,
    "imagenUrl" TEXT,
    "ctaTexto" TEXT,
    "ctaLink" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoPublicacion" NOT NULL DEFAULT 'BORRADOR',
    "publicarDesde" TIMESTAMP(3),
    "publicarHasta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebSlide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebAnuncio" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "enlace" TEXT,
    "textoEnlace" TEXT,
    "color" TEXT NOT NULL DEFAULT 'violeta',
    "estado" "EstadoPublicacion" NOT NULL DEFAULT 'BORRADOR',
    "publicarDesde" TIMESTAMP(3),
    "publicarHasta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebAnuncio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebEvento" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "hora" TEXT NOT NULL,
    "lugar" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'evento-especial',
    "recurrente" BOOLEAN NOT NULL DEFAULT false,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "imagenPath" TEXT,
    "imagenUrl" TEXT,
    "estado" "EstadoPublicacion" NOT NULL DEFAULT 'BORRADOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebEvento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebPredica" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "predicador" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "serie" TEXT,
    "etiquetas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imagenPath" TEXT,
    "destacada" BOOLEAN NOT NULL DEFAULT false,
    "vistas" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoPublicacion" NOT NULL DEFAULT 'BORRADOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebPredica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebMinisterio" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "publico" TEXT,
    "horario" TEXT,
    "lugar" TEXT,
    "lider" TEXT,
    "correo" TEXT,
    "imagenPath" TEXT,
    "imagenUrl" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoPublicacion" NOT NULL DEFAULT 'BORRADOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebMinisterio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeticionOracion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT,
    "mensaje" TEXT NOT NULL,
    "anonima" BOOLEAN NOT NULL DEFAULT false,
    "estado" "EstadoPeticion" NOT NULL DEFAULT 'NUEVA',
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeticionOracion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebEvento_fecha_idx" ON "WebEvento"("fecha");

-- CreateIndex
CREATE INDEX "WebPredica_fecha_idx" ON "WebPredica"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "WebMinisterio_slug_key" ON "WebMinisterio"("slug");

-- CreateIndex
CREATE INDEX "PeticionOracion_estado_createdAt_idx" ON "PeticionOracion"("estado", "createdAt");
