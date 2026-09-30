-- AlterTable
ALTER TABLE "WebSitio" ADD COLUMN     "envivoActivo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "envivoDescripcion" TEXT,
ADD COLUMN     "envivoHasta" TIMESTAMP(3),
ADD COLUMN     "envivoProxima" TEXT,
ADD COLUMN     "envivoTitulo" TEXT,
ADD COLUMN     "envivoUrl" TEXT;

