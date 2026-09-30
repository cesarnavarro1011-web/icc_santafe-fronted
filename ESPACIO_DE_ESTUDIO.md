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

# 5. (Opcional) Contenido inicial de la página web: portada, eventos, ministerios, anuncio
npm run db:contenido

# 6. Arrancar
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
| Pastor | **Auditor**: ve todo y supervisa a los supervisores. Gestiona catálogo, fieles, bautismos, pagos, usuarios, asignaciones, grupos y el cronograma; verifica diezmos y ofrendas; da la firma final de certificados. No registra asistencia ni califica |
| Supervisor | Supervisa los cursos asignados: control de calidad, asistencia de clases, firma de certificados |
| Líder | Su grupo (Mi grupo), fieles y bautismos; registra la asistencia cuando su grupo tiene turno y los diezmos y ofrendas recogidos |
| Maestro | Sus cursos: tareas, exámenes, asistencia de clases y aprobación |
| Estudiante | Sus cursos, entregas, exámenes, asistencia y certificados |
| Gestor de contenido | Alimenta la página web pública: portada, anuncios, eventos, prédicas, ministerios y peticiones de oración |

**Asistencia de la iglesia por turnos:** el pastor arma los grupos (Grupos y líderes) y asigna cada semana
qué grupo registra (Cronograma de asistencia, con rotación automática). Solo el líder del grupo de turno
puede registrar en esa semana (lunes a domingo).

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

## Correos y WhatsApp

Se configuran en `.env` (instrucciones paso a paso en `.env.example`). Sin configurar, todo se imprime en
la consola del servidor, así que se puede probar 100 % local.

| Mensaje | Correo | WhatsApp | Dónde se dispara |
| --- | --- | --- | --- |
| Pago de curso registrado o actualizado | ✓ | | Inscripciones y pagos (al crear, o si cambia el monto o el estado) |
| Acceso a un curso nuevo (con botón "Ir al curso") | ✓ | | Al quedar matriculado (pago completado o exento) |
| Recuperar contraseña (código de 6 dígitos) | ✓ | ✓ | Login → Recuperar cuenta; el usuario elige el canal |
| Comunicados masivos (asunto, mensaje, imágenes, botón) | ✓ | ✓ | Menú **Comunicación → Comunicados** |

**Comunicados:** se guardan como borrador, se prueban con "Enviarme una prueba" y se envían a todos los
fieles activos o filtrados por rol, grupo, curso o cargo. El envío corre en segundo plano (3 a la vez) y la
página muestra el avance, los fallidos y permite reintentarlos. Los correos llevan el enlace "No quiero
recibir más comunicados"; quien se da de baja sigue recibiendo los avisos de sus cursos, pagos y contraseña.
En WhatsApp se usa la plantilla `WHATSAPP_PLANTILLA_INFO` (solo texto, sin imágenes).

**WhatsApp es opcional (la API de Meta cobra por mensaje).** Mientras `WHATSAPP_TOKEN` esté vacío, WhatsApp
no aparece en ninguna pantalla: la recuperación de contraseña y la verificación en dos pasos van por correo y
los comunicados solo se envían por correo. Para correo gratis basta una cuenta de Gmail con contraseña de
aplicación (límite aprox. 500 destinatarios al día).

## Pagos en línea (Mercado Pago) y códigos de promoción

- El estudiante pulsa **Quiero este curso** en un curso de pago → `/workspace/pagar/<curso>`: ve el precio,
  puede aplicar un **código de promoción** y paga en Mercado Pago (Checkout Pro: tarjeta, PSE, Nequi, Efecty…).
- Cuando Mercado Pago aprueba el pago, la inscripción pasa a **Completado** y el estudiante queda **matriculado
  automáticamente** (correo de pago + correo de acceso). El pago se verifica siempre consultando la API de
  Mercado Pago (webhook o página de retorno), nunca con datos del navegador, y se valida que el monto coincida.
- Con un código del 100 % se matricula de inmediato sin pasar por Mercado Pago.
- **Códigos de promoción** (menú General, pastor y superadmin): porcentaje o valor fijo, para un curso o todos,
  límite de usos y fechas. El uso se cuenta cuando el pago queda aprobado.
- Configuración en `.env`: `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_WEBHOOK_SECRET` (ver `.env.example`).
  Sin token, en desarrollo el pago se simula con un botón; en producción queda deshabilitado.
- Los cursos gratuitos siguen con la solicitud que aprueba el pastor.

## Página web pública

La portada (`/`) y las páginas de ministerios leen su contenido de la base de datos. Se administra en
**Página web** del espacio de estudio (roles Gestor de contenido, Pastor y Superadmin):

- **Portada:** carrusel con imagen, botón, orden y fechas de publicación (programar inicio y fin).
- **Anuncios:** barra flotante que el visitante puede cerrar.
- **Eventos:** con categoría, destacado y "Agregar a mi calendario" (.ics) para el visitante.
- **Prédicas:** enlace de YouTube/Vimeo; se ven dentro de la página, con búsqueda, series, vistas y compartir.
- **Ministerios:** tarjeta en la portada y página propia en `/ministerios/<slug>`.
- **Peticiones de oración:** formulario público (con límite anti-spam) y bandeja para el equipo.

Las imágenes subidas se guardan en `STORAGE_DIR/web/` y se sirven públicamente por `/api/publico/web/...`.
