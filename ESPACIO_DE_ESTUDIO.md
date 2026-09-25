# Espacio de estudio · ICC Santa Fe

Sistema de gestión académica y congregacional (antes en Google Apps Script + Sheets) integrado en este
proyecto Next.js, con PostgreSQL + Prisma. Todo corre localmente: la base de datos en tu Postgres y los
archivos (tareas, firmas, certificados, material) en una carpeta de tu disco `C:`.

## Puesta en marcha

```bash
# 1. Variables de entorno
copy .env.example .env        # y completa DATABASE_URL, NEXTAUTH_SECRET y STORAGE_DIR

# 2. Crear las tablas (usa la migración incluida en prisma/migrations)
npm run db:migrate

# 3. Tu usuario superadmin
npm run db:superadmin -- --usuario admin --password "TuClave123" --nombre Cesar --apellido Navarro --correo tu@correo.com

# 4. (Opcional) Importar los datos del Excel del sistema anterior
npm run db:importar -- "C:\Users\TECNOLOGIA\Downloads\Software  Para iglesia.xlsx"

# 5. Arrancar
npm run dev    # → http://localhost:3000/login
```

Se entra con **usuario**, **ID de fiel** (`F-1004355591`) o **correo**. Las contraseñas importadas del
sistema anterior siguen funcionando y se convierten a bcrypt en el primer inicio de sesión.

Sin `SMTP_HOST` en `.env`, los correos (códigos OTP, confirmaciones) se imprimen en la consola donde corre
`npm run dev`: sirve para recuperar contraseñas trabajando 100 % local.

## Roles

| Rol | Qué hace |
| --- | --- |
| Superadmin | Todo, sin restricciones (incluido registrar asistencia cualquier semana) |
| Pastor | **Auditor**: ve todo y supervisa a los supervisores. Gestiona catálogo, fieles, bautismos, pagos, usuarios, asignaciones, grupos y el cronograma; da la firma final de certificados. No registra asistencia ni califica |
| Supervisor | Supervisa los cursos asignados: control de calidad, asistencia de clases, firma de certificados |
| Líder | Su grupo (Mi grupo), fieles y bautismos; nombra marcadores; registra la asistencia de la iglesia cuando su grupo tiene turno |
| Marcador | Fiel del grupo que apoya al líder registrando la asistencia cuando su grupo tiene turno |
| Maestro | Sus cursos: tareas, exámenes, asistencia de clases y aprobación |
| Estudiante | Sus cursos, entregas, exámenes, asistencia y certificados |

**Asistencia de la iglesia por turnos:** el pastor arma los grupos (Grupos y líderes) y asigna cada semana
qué grupo registra (Cronograma de asistencia, con rotación automática). Solo el líder y los marcadores del
grupo de turno pueden registrar en esa semana (lunes a domingo).

Todos los roles tienen “Mis cursos” y “Perfil”. Los permisos por ruta están en `src/lib/roles.ts`.

## De hojas a tablas

| Hoja (Sheets) | Tabla / modelo Prisma | Cambio principal |
| --- | --- | --- |
| Fieles | `Fiel` | El ID `F-…` se conserva en `codigo` |
| Credenciales_Acceso | `Usuario` | bcrypt; "Temp" → `debeCambiarPassword` |
| Bautismos | `Bautismo` | |
| Asistencias | `AsistenciaCongregacional` | Invitados sin ficha → `fielId` vacío |
| Cursos_Catalogo | `Curso` | Incluye costo y duración |
| Catalogo_Actividades | `Actividad` | Material subido al disco o link |
| Maestros_Asignados / Supervisores_Niveles | `AsignacionMaestro` / `AsignacionSupervisor` | |
| Inscripciones_Pagos | `Inscripcion` | Completado/Exento matricula automáticamente |
| Control_Academico + Cursos_Historico | `Matricula` | Unificadas en una sola tabla |
| Entregas_Tareas | `Entrega` | PDF en disco local |
| Notas_Detalle | `Nota` | Una nota vigente por actividad |
| Banco_Preguntas | `Pregunta` | |
| (examen como JSON en Entregas) | `IntentoExamen` | Detalle de respuestas estructurado |
| Control_Asistencias_Cursos | `SesionClase` + `AsistenciaCurso` | Las faltas se calculan bien |
| Certificados_Emitidos | `Certificado` | Maestro → Supervisor → Pastor → PDF |
| Areas_Inscritas / Eventos_Especiales | `Area`, `MiembroArea`, `EventoEspecial` | Datos migrados, aún sin pantalla |
| Log_Envios | `LogEnvio` | Correos fallidos |
| CacheService (OTP) | `OtpCode` | |

## Dónde está cada cosa

- `prisma/schema.prisma`: modelo de datos
- `src/server/`: lógica de negocio (matrícula, cálculo de notas, asistencia, certificados PDF, OTP)
- `src/app/workspace/<módulo>/`: páginas (`page.tsx`) y server actions (`actions.ts`)
- `src/lib/server/storage.ts`: archivos en disco (reemplaza Drive); se sirven con permisos en `/api/archivos/…`
- `src/lib/config.ts`: nota mínima (6), nota máxima (10) y asistencia mínima (75 %)
- `scripts/`: importación del Excel y creación del superadmin
