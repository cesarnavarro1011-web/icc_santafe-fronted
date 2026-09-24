-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('SUPERADMIN', 'PASTOR', 'SUPERVISOR', 'LIDER', 'MAESTRO', 'ESTUDIANTE');

-- CreateEnum
CREATE TYPE "EstadoRegistro" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "EstadoCivil" AS ENUM ('SOLTERO', 'CASADO', 'DIVORCIADO', 'VIUDO', 'UNION_LIBRE');

-- CreateEnum
CREATE TYPE "TipoBautismo" AS ENUM ('AGUA', 'ESPIRITU');

-- CreateEnum
CREATE TYPE "TipoServicio" AS ENUM ('DOMINGO', 'MIERCOLES', 'GV', 'ESPECIAL', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoActividad" AS ENUM ('TAREA', 'EXAMEN', 'MATERIAL', 'CLASE');

-- CreateEnum
CREATE TYPE "EstadoMatricula" AS ENUM ('EN_PROGRESO', 'APROBADO', 'REPROBADO', 'VENCIDO', 'RETIRADO');

-- CreateEnum
CREATE TYPE "EstadoEntrega" AS ENUM ('ENVIADA', 'APROBADA', 'REPROBADA', 'DEVUELTA');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'ABONO', 'COMPLETADO', 'EXENTO');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'NEQUI', 'DAVIPLATA', 'EXENTO');

-- CreateEnum
CREATE TYPE "RolMaestro" AS ENUM ('TITULAR', 'AUXILIAR');

-- CreateEnum
CREATE TYPE "EstadoCertificado" AS ENUM ('EN_FIRMA', 'EMITIDO', 'ANULADO');

-- CreateEnum
CREATE TYPE "PropositoOtp" AS ENUM ('CAMBIO_PASSWORD');

-- CreateTable
CREATE TABLE "Fiel" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "fechaNacimiento" DATE,
    "estadoCivil" "EstadoCivil",
    "bautizado" BOOLEAN NOT NULL DEFAULT false,
    "celular" TEXT,
    "direccion" TEXT,
    "correo" TEXT,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fiel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "fielId" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'ESTUDIANTE',
    "debeCambiarPassword" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "firmaPath" TEXT,
    "ultimoAcceso" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "proposito" "PropositoOtp" NOT NULL,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bautismo" (
    "id" TEXT NOT NULL,
    "fielId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "ministro" TEXT,
    "lugar" TEXT,
    "tipo" "TipoBautismo" NOT NULL DEFAULT 'AGUA',
    "certificadoPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bautismo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsistenciaCongregacional" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fielId" TEXT,
    "nombreInvitado" TEXT,
    "servicio" "TipoServicio" NOT NULL,
    "registradoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AsistenciaCongregacional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiembroArea" (
    "id" TEXT NOT NULL,
    "fielId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "cargo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MiembroArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoEspecial" (
    "id" TEXT NOT NULL,
    "fielId" TEXT NOT NULL,
    "tipo" TEXT,
    "nombre" TEXT,
    "fechaInicio" TIMESTAMP(3),
    "lugar" TEXT,
    "estado" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoEspecial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Curso" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nivel" INTEGER,
    "descripcion" TEXT,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "duracionDias" INTEGER NOT NULL DEFAULT 90,
    "costo" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Actividad" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL DEFAULT 1,
    "tipo" "TipoActividad" NOT NULL DEFAULT 'TAREA',
    "nombre" TEXT NOT NULL,
    "notaMax" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "peso" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "linkMaterial" TEXT,
    "materialPath" TEXT,
    "instrucciones" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Actividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsignacionMaestro" (
    "id" TEXT NOT NULL,
    "fielId" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "nivel" INTEGER,
    "rol" "RolMaestro" NOT NULL DEFAULT 'TITULAR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AsignacionMaestro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsignacionSupervisor" (
    "id" TEXT NOT NULL,
    "fielId" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "nivelAutorizado" TEXT NOT NULL DEFAULT 'Todos',
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AsignacionSupervisor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inscripcion" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "fielId" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "costoTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "montoPagado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estadoPago" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "metodoPago" "MetodoPago",
    "comprobantePath" TEXT,
    "registradoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Matricula" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "fielId" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "maestroId" TEXT,
    "supervisorId" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVencimiento" TIMESTAMP(3),
    "progreso" INTEGER NOT NULL DEFAULT 0,
    "notaFinal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estado" "EstadoMatricula" NOT NULL DEFAULT 'EN_PROGRESO',
    "aprobadoMaestroAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Matricula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entrega" (
    "id" TEXT NOT NULL,
    "matriculaId" TEXT NOT NULL,
    "fielId" TEXT NOT NULL,
    "actividadId" TEXT NOT NULL,
    "archivoPath" TEXT,
    "archivoNombre" TEXT,
    "linkExterno" TEXT,
    "estado" "EstadoEntrega" NOT NULL DEFAULT 'ENVIADA',
    "comentario" TEXT,
    "revisadoPorId" TEXT,
    "revisadoAt" TIMESTAMP(3),
    "fechaEntrega" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nota" (
    "id" TEXT NOT NULL,
    "matriculaId" TEXT NOT NULL,
    "fielId" TEXT NOT NULL,
    "actividadId" TEXT NOT NULL,
    "entregaId" TEXT,
    "intentoExamenId" TEXT,
    "nota" DOUBLE PRECISION NOT NULL,
    "notaMax" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "comentario" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pregunta" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL DEFAULT 1,
    "actividadId" TEXT,
    "pregunta" TEXT NOT NULL,
    "respuestaCorrecta" TEXT NOT NULL,
    "puntos" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pregunta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntentoExamen" (
    "id" TEXT NOT NULL,
    "matriculaId" TEXT NOT NULL,
    "fielId" TEXT NOT NULL,
    "actividadId" TEXT NOT NULL,
    "detalle" JSONB NOT NULL,
    "puntosObtenidos" DOUBLE PRECISION NOT NULL,
    "puntosTotal" DOUBLE PRECISION NOT NULL,
    "notaAutomatica" DOUBLE PRECISION NOT NULL,
    "notaManual" DOUBLE PRECISION,
    "motivoEdicion" TEXT,
    "editadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntentoExamen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SesionClase" (
    "id" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL DEFAULT 1,
    "fecha" DATE NOT NULL,
    "tema" TEXT,
    "creadaPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SesionClase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsistenciaCurso" (
    "id" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "fielId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AsistenciaCurso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificado" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "fielId" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "matriculaId" TEXT,
    "firmaMaestroId" TEXT,
    "firmaMaestroAt" TIMESTAMP(3),
    "firmaSupervisorId" TEXT,
    "firmaSupervisorAt" TIMESTAMP(3),
    "firmaPastorId" TEXT,
    "firmaPastorAt" TIMESTAMP(3),
    "estado" "EstadoCertificado" NOT NULL DEFAULT 'EN_FIRMA',
    "pdfPath" TEXT,
    "linkExterno" TEXT,
    "emitidoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogEnvio" (
    "id" TEXT NOT NULL,
    "destino" TEXT,
    "asunto" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogEnvio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Fiel_codigo_key" ON "Fiel"("codigo");

-- CreateIndex
CREATE INDEX "Fiel_apellido_nombre_idx" ON "Fiel"("apellido", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_fielId_key" ON "Usuario"("fielId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_usuario_key" ON "Usuario"("usuario");

-- CreateIndex
CREATE INDEX "OtpCode_usuarioId_proposito_idx" ON "OtpCode"("usuarioId", "proposito");

-- CreateIndex
CREATE INDEX "AsistenciaCongregacional_fecha_idx" ON "AsistenciaCongregacional"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Area_nombre_key" ON "Area"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "MiembroArea_fielId_areaId_key" ON "MiembroArea"("fielId", "areaId");

-- CreateIndex
CREATE UNIQUE INDEX "Curso_codigo_key" ON "Curso"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Actividad_codigo_key" ON "Actividad"("codigo");

-- CreateIndex
CREATE INDEX "Actividad_cursoId_nivel_idx" ON "Actividad"("cursoId", "nivel");

-- CreateIndex
CREATE UNIQUE INDEX "AsignacionMaestro_fielId_cursoId_nivel_key" ON "AsignacionMaestro"("fielId", "cursoId", "nivel");

-- CreateIndex
CREATE UNIQUE INDEX "AsignacionSupervisor_fielId_cursoId_key" ON "AsignacionSupervisor"("fielId", "cursoId");

-- CreateIndex
CREATE UNIQUE INDEX "Inscripcion_codigo_key" ON "Inscripcion"("codigo");

-- CreateIndex
CREATE INDEX "Inscripcion_fielId_idx" ON "Inscripcion"("fielId");

-- CreateIndex
CREATE UNIQUE INDEX "Matricula_codigo_key" ON "Matricula"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Matricula_fielId_cursoId_key" ON "Matricula"("fielId", "cursoId");

-- CreateIndex
CREATE INDEX "Entrega_actividadId_estado_idx" ON "Entrega"("actividadId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Nota_entregaId_key" ON "Nota"("entregaId");

-- CreateIndex
CREATE UNIQUE INDEX "Nota_intentoExamenId_key" ON "Nota"("intentoExamenId");

-- CreateIndex
CREATE UNIQUE INDEX "Nota_matriculaId_actividadId_key" ON "Nota"("matriculaId", "actividadId");

-- CreateIndex
CREATE UNIQUE INDEX "Pregunta_codigo_key" ON "Pregunta"("codigo");

-- CreateIndex
CREATE INDEX "Pregunta_cursoId_nivel_idx" ON "Pregunta"("cursoId", "nivel");

-- CreateIndex
CREATE INDEX "IntentoExamen_actividadId_idx" ON "IntentoExamen"("actividadId");

-- CreateIndex
CREATE UNIQUE INDEX "SesionClase_cursoId_nivel_fecha_key" ON "SesionClase"("cursoId", "nivel", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "AsistenciaCurso_sesionId_fielId_key" ON "AsistenciaCurso"("sesionId", "fielId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificado_codigo_key" ON "Certificado"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Certificado_fielId_cursoId_key" ON "Certificado"("fielId", "cursoId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_fielId_fkey" FOREIGN KEY ("fielId") REFERENCES "Fiel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bautismo" ADD CONSTRAINT "Bautismo_fielId_fkey" FOREIGN KEY ("fielId") REFERENCES "Fiel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsistenciaCongregacional" ADD CONSTRAINT "AsistenciaCongregacional_fielId_fkey" FOREIGN KEY ("fielId") REFERENCES "Fiel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiembroArea" ADD CONSTRAINT "MiembroArea_fielId_fkey" FOREIGN KEY ("fielId") REFERENCES "Fiel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiembroArea" ADD CONSTRAINT "MiembroArea_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoEspecial" ADD CONSTRAINT "EventoEspecial_fielId_fkey" FOREIGN KEY ("fielId") REFERENCES "Fiel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actividad" ADD CONSTRAINT "Actividad_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionMaestro" ADD CONSTRAINT "AsignacionMaestro_fielId_fkey" FOREIGN KEY ("fielId") REFERENCES "Fiel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionMaestro" ADD CONSTRAINT "AsignacionMaestro_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionSupervisor" ADD CONSTRAINT "AsignacionSupervisor_fielId_fkey" FOREIGN KEY ("fielId") REFERENCES "Fiel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionSupervisor" ADD CONSTRAINT "AsignacionSupervisor_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_fielId_fkey" FOREIGN KEY ("fielId") REFERENCES "Fiel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matricula" ADD CONSTRAINT "Matricula_fielId_fkey" FOREIGN KEY ("fielId") REFERENCES "Fiel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matricula" ADD CONSTRAINT "Matricula_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matricula" ADD CONSTRAINT "Matricula_maestroId_fkey" FOREIGN KEY ("maestroId") REFERENCES "Fiel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matricula" ADD CONSTRAINT "Matricula_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Fiel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "Matricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_fielId_fkey" FOREIGN KEY ("fielId") REFERENCES "Fiel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_actividadId_fkey" FOREIGN KEY ("actividadId") REFERENCES "Actividad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_revisadoPorId_fkey" FOREIGN KEY ("revisadoPorId") REFERENCES "Fiel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "Matricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_fielId_fkey" FOREIGN KEY ("fielId") REFERENCES "Fiel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_actividadId_fkey" FOREIGN KEY ("actividadId") REFERENCES "Actividad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_entregaId_fkey" FOREIGN KEY ("entregaId") REFERENCES "Entrega"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_intentoExamenId_fkey" FOREIGN KEY ("intentoExamenId") REFERENCES "IntentoExamen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pregunta" ADD CONSTRAINT "Pregunta_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pregunta" ADD CONSTRAINT "Pregunta_actividadId_fkey" FOREIGN KEY ("actividadId") REFERENCES "Actividad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntentoExamen" ADD CONSTRAINT "IntentoExamen_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "Matricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntentoExamen" ADD CONSTRAINT "IntentoExamen_fielId_fkey" FOREIGN KEY ("fielId") REFERENCES "Fiel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntentoExamen" ADD CONSTRAINT "IntentoExamen_actividadId_fkey" FOREIGN KEY ("actividadId") REFERENCES "Actividad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesionClase" ADD CONSTRAINT "SesionClase_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsistenciaCurso" ADD CONSTRAINT "AsistenciaCurso_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "SesionClase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsistenciaCurso" ADD CONSTRAINT "AsistenciaCurso_fielId_fkey" FOREIGN KEY ("fielId") REFERENCES "Fiel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificado" ADD CONSTRAINT "Certificado_fielId_fkey" FOREIGN KEY ("fielId") REFERENCES "Fiel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificado" ADD CONSTRAINT "Certificado_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificado" ADD CONSTRAINT "Certificado_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "Matricula"("id") ON DELETE SET NULL ON UPDATE CASCADE;

