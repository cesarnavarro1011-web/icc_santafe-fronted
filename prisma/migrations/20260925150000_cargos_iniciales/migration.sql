-- Cargos / ministerios iniciales de la iglesia (tabla "Area"). Se pueden agregar más desde Fieles.
INSERT INTO "Area" ("id", "nombre", "estado") VALUES
  (gen_random_uuid()::text, 'Fiel', 'ACTIVO'),
  (gen_random_uuid()::text, 'Líder', 'ACTIVO'),
  (gen_random_uuid()::text, 'Maestro', 'ACTIVO'),
  (gen_random_uuid()::text, 'Ministerio de alabanza', 'ACTIVO'),
  (gen_random_uuid()::text, 'Ministerio de danza', 'ACTIVO'),
  (gen_random_uuid()::text, 'Audiovisuales', 'ACTIVO'),
  (gen_random_uuid()::text, 'Sonido', 'ACTIVO'),
  (gen_random_uuid()::text, 'Ujier / servidor', 'ACTIVO'),
  (gen_random_uuid()::text, 'Intercesión', 'ACTIVO'),
  (gen_random_uuid()::text, 'Ministerio infantil', 'ACTIVO')
ON CONFLICT ("nombre") DO NOTHING;
