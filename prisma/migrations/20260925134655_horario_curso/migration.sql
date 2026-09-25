-- AlterTable
ALTER TABLE "Curso" ADD COLUMN     "diasClase" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "horaFin" TEXT,
ADD COLUMN     "horaInicio" TEXT;
