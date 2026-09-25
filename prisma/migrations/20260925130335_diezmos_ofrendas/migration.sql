-- CreateEnum
CREATE TYPE "TipoOfrenda" AS ENUM ('DIEZMO', 'OFRENDA', 'PRIMICIA', 'PRO_TEMPLO', 'MISIONES', 'ACCION_GRACIAS', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoOfrenda" AS ENUM ('PENDIENTE', 'VERIFICADO', 'OBSERVADO');

-- CreateTable
CREATE TABLE "RegistroOfrenda" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "servicio" "TipoServicio" NOT NULL,
    "tipo" "TipoOfrenda" NOT NULL,
    "metodo" "MetodoPago" NOT NULL DEFAULT 'EFECTIVO',
    "monto" DECIMAL(14,2) NOT NULL,
    "descripcion" TEXT,
    "registradoPorId" TEXT NOT NULL,
    "grupoId" TEXT,
    "estado" "EstadoOfrenda" NOT NULL DEFAULT 'PENDIENTE',
    "verificadoPorId" TEXT,
    "verificadoAt" TIMESTAMP(3),
    "observacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroOfrenda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegistroOfrenda_fecha_idx" ON "RegistroOfrenda"("fecha");

-- CreateIndex
CREATE INDEX "RegistroOfrenda_registradoPorId_idx" ON "RegistroOfrenda"("registradoPorId");

-- AddForeignKey
ALTER TABLE "RegistroOfrenda" ADD CONSTRAINT "RegistroOfrenda_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Fiel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroOfrenda" ADD CONSTRAINT "RegistroOfrenda_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
