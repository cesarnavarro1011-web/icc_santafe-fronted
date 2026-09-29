-- CreateTable
CREATE TABLE "WebSitio" (
    "id" TEXT NOT NULL DEFAULT 'principal',
    "nombre" TEXT NOT NULL DEFAULT 'Iglesia Cuadrangular Santa Fe',
    "lema" TEXT,
    "descripcion" TEXT,
    "telefono" TEXT,
    "whatsapp" TEXT,
    "correo" TEXT,
    "direccion" TEXT,
    "ciudad" TEXT,
    "mapaUrl" TEXT,
    "emergencias" TEXT,
    "horarios" TEXT,
    "facebook" TEXT,
    "instagram" TEXT,
    "youtube" TEXT,
    "tiktok" TEXT,
    "nosotrosTitulo" TEXT,
    "nosotrosTexto" TEXT,
    "nosotrosImagenPath" TEXT,
    "mision" TEXT,
    "vision" TEXT,
    "valores" TEXT,
    "estadisticas" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebSitio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebHistoria" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "periodo" TEXT,
    "texto" TEXT NOT NULL,
    "imagenPath" TEXT,
    "imagenUrl" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoPublicacion" NOT NULL DEFAULT 'PUBLICADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebHistoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebPersona" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cargo" TEXT,
    "descripcion" TEXT,
    "seccion" TEXT NOT NULL,
    "imagenPath" TEXT,
    "imagenUrl" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoPublicacion" NOT NULL DEFAULT 'PUBLICADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebPersona_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebPersona_seccion_orden_idx" ON "WebPersona"("seccion", "orden");

-- ── Datos iniciales: lo que la página mostraba escrito en el código ──
-- Teléfonos y correo de ejemplo ("+1 (555)…", contacto@iglesiacristiana.com) NO se copian:
-- quedan vacíos hasta que se escriban los reales en "Datos de la iglesia".
INSERT INTO "WebSitio" ("id", "nombre", "lema", "descripcion", "direccion", "horarios",
  "nosotrosTitulo", "nosotrosTexto", "mision", "vision", "valores", "estadisticas", "updatedAt")
VALUES (
  'principal',
  'Iglesia Cuadrangular Santa Fe',
  'Creciendo en número y en conocimiento',
  'Somos una comunidad cristiana comprometida con el amor de Dios y el servicio al prójimo. Te invitamos a ser parte de nuestra familia en la fe.',
  'Carrera 43 #16-05 Barrio Santa Fe',
  E'Domingos\n9:00 a. m. — Escuela dominical\n10:00 a. m. — Servicio principal\n\nMiércoles\n7:00 p. m. — Reunión de oración\n\nViernes\n7:00 p. m. — Ministerio de jóvenes',
  'Nuestra Historia, Nuestra Fe',
  'Conoce más sobre quiénes somos, qué creemos y cómo Dios nos ha guiado a lo largo de estos años de ministerio y servicio a la comunidad.',
  'Nuestra misión es glorificar a Dios mediante la adoración, discipular a los creyentes en la fe cristiana, evangelizar a los perdidos con amor y compasión, y servir a nuestra comunidad con el corazón de Cristo.',
  'Ser una iglesia que transforma vidas y comunidades a través del amor de Cristo, siendo un faro de esperanza y un centro de crecimiento espiritual para todas las personas.',
  E'Amor incondicional hacia Dios y al prójimo\nIntegridad y transparencia en todas nuestras acciones\nServicio desinteresado a la comunidad\nCrecimiento espiritual continuo\nUnidad en la diversidad\nExcelencia en todo lo que hacemos',
  '[{"valor":"300+","etiqueta":"Miembros activos"},{"valor":"47","etiqueta":"Años de ministerio"},{"valor":"8","etiqueta":"Ministerios activos"},{"valor":"1000+","etiqueta":"Vidas transformadas"}]',
  CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;

-- Sucesión pastoral (con las fotos que ya están en /public/images)
INSERT INTO "WebPersona" ("id", "nombre", "cargo", "seccion", "imagenUrl", "orden", "estado", "updatedAt") VALUES
  (gen_random_uuid()::text, 'Pr. Hernando Rincón', 'Pastorado fundacional', 'fundadores', '/images/hernando.jpg', 1, 'PUBLICADO', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Pr. Helda Sánchez', 'Pastorado fundacional', 'fundadores', '/images/helda.jpg', 2, 'PUBLICADO', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Pr. Nando Rincón', 'Pastorado actual', 'actuales', '/images/nando.jpg', 1, 'PUBLICADO', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Pr. Liceth Rebolledo', 'Pastorado actual', 'actuales', '/images/liceth.jpg', 2, 'PUBLICADO', CURRENT_TIMESTAMP);

-- Equipo pastoral e historia de EJEMPLO: quedan como borrador (no se ven) para editarlos y publicarlos
INSERT INTO "WebPersona" ("id", "nombre", "cargo", "descripcion", "seccion", "orden", "estado", "updatedAt") VALUES
  (gen_random_uuid()::text, 'Nombre del pastor', 'Pastor principal', 'Texto de ejemplo: reemplázalo con la reseña real.', 'equipo', 1, 'BORRADOR', CURRENT_TIMESTAMP);

INSERT INTO "WebHistoria" ("id", "titulo", "periodo", "texto", "orden", "estado", "updatedAt") VALUES
  (gen_random_uuid()::text, 'Los primeros años', '1999 - 2005', 'Texto de ejemplo: cuenta aquí cómo empezó la iglesia.', 1, 'BORRADOR', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Crecimiento y expansión', '2005 - 2015', 'Texto de ejemplo: el primer templo, los ministerios que nacieron…', 2, 'BORRADOR', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Hoy', '2015 - presente', 'Texto de ejemplo: dónde está la iglesia hoy y hacia dónde va.', 3, 'BORRADOR', CURRENT_TIMESTAMP);
