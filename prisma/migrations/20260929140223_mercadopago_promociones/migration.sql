-- CreateEnum
CREATE TYPE "TipoDescuento" AS ENUM ('PORCENTAJE', 'VALOR');

-- AlterEnum
ALTER TYPE "MetodoPago" ADD VALUE 'MERCADOPAGO';

-- AlterTable
ALTER TABLE "Inscripcion" ADD COLUMN     "codigoPromoId" TEXT,
ADD COLUMN     "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "mpEstado" TEXT,
ADD COLUMN     "mpPagoId" TEXT,
ADD COLUMN     "mpPreferenciaId" TEXT;

-- CreateTable
CREATE TABLE "CodigoPromocion" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" "TipoDescuento" NOT NULL DEFAULT 'PORCENTAJE',
    "valor" DECIMAL(12,2) NOT NULL,
    "cursoId" TEXT,
    "usosMax" INTEGER,
    "usos" INTEGER NOT NULL DEFAULT 0,
    "validoDesde" TIMESTAMP(3),
    "validoHasta" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodigoPromocion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodigoPromocion_codigo_key" ON "CodigoPromocion"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Inscripcion_mpPagoId_key" ON "Inscripcion"("mpPagoId");

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_codigoPromoId_fkey" FOREIGN KEY ("codigoPromoId") REFERENCES "CodigoPromocion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodigoPromocion" ADD CONSTRAINT "CodigoPromocion_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

