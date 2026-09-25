-- AlterEnum
ALTER TYPE "Rol" ADD VALUE 'MARCADOR';

-- AlterTable
ALTER TABLE "Fiel" ADD COLUMN     "grupoId" TEXT;

-- CreateTable
CREATE TABLE "Grupo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "liderId" TEXT,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TurnoAsistencia" (
    "id" TEXT NOT NULL,
    "semana" DATE NOT NULL,
    "grupoId" TEXT NOT NULL,
    "notas" TEXT,
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TurnoAsistencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Grupo_nombre_key" ON "Grupo"("nombre");

-- CreateIndex
CREATE INDEX "TurnoAsistencia_semana_idx" ON "TurnoAsistencia"("semana");

-- CreateIndex
CREATE UNIQUE INDEX "TurnoAsistencia_grupoId_semana_key" ON "TurnoAsistencia"("grupoId", "semana");

-- AddForeignKey
ALTER TABLE "Fiel" ADD CONSTRAINT "Fiel_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_liderId_fkey" FOREIGN KEY ("liderId") REFERENCES "Fiel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnoAsistencia" ADD CONSTRAINT "TurnoAsistencia_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
