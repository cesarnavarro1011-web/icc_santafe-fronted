-- CreateTable
CREATE TABLE "PlantillaCertificado" (
    "id" TEXT NOT NULL DEFAULT 'principal',
    "institucion" TEXT,
    "subtitulo" TEXT,
    "titulo" TEXT,
    "textoIntro" TEXT,
    "textoPrograma" TEXT,
    "versiculo" TEXT,
    "versiculoCita" TEXT,
    "mostrarVersiculo" BOOLEAN NOT NULL DEFAULT true,
    "lugar" TEXT,
    "cargoMaestro" TEXT,
    "cargoSupervisor" TEXT,
    "cargoPastor" TEXT,
    "logoPath" TEXT,
    "selloPath" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantillaCertificado_pkey" PRIMARY KEY ("id")
);

