import "server-only";
import { prisma } from "@/lib/prisma";
import { dinero, ESTADO_PAGO, fecha, METODO_PAGO } from "@/lib/labels";
import { enviarCorreo, esc, plantillaCorreo, tablaDatos } from "@/lib/server/mail";

// ============================================================
//  Correos automáticos del espacio de estudio.
//  Nunca lanzan: si el correo falla, el registro (pago, matrícula…) ya quedó
//  guardado y el error queda en LogEnvio.
// ============================================================

/** Pago de curso registrado o actualizado (Inscripciones y pagos). */
export async function notificarPagoCurso(inscripcionId: string, esNueva: boolean) {
  try {
    const i = await prisma.inscripcion.findUnique({ where: { id: inscripcionId }, include: { fiel: true, curso: true } });
    if (!i?.fiel.correo) return;

    const costo = Number(i.costoTotal);
    const pagado = Number(i.montoPagado);
    const saldo = Math.max(0, costo - pagado);
    const estado = ESTADO_PAGO[i.estadoPago].label;
    const habilita = i.estadoPago === "COMPLETADO" || i.estadoPago === "EXENTO";

    const intro = habilita
      ? i.estadoPago === "EXENTO"
        ? `Tu inscripción al curso <strong>${esc(i.curso.nombre)}</strong> quedó registrada como <strong>exenta de pago</strong>.`
        : `Recibimos el pago completo del curso <strong>${esc(i.curso.nombre)}</strong>. ¡Gracias!`
      : esNueva
        ? `Registramos tu inscripción al curso <strong>${esc(i.curso.nombre)}</strong>.`
        : `Actualizamos el estado del pago de tu curso <strong>${esc(i.curso.nombre)}</strong>.`;

    const filas: [string, string][] = [
      ["Curso", i.curso.nombre],
      ["Código de inscripción", i.codigo],
      ["Valor del curso", costo > 0 ? dinero(costo) : "Gratis"],
      ["Pagado", dinero(pagado)],
      ...(saldo > 0 && i.estadoPago !== "EXENTO" ? ([["Saldo pendiente", dinero(saldo)]] as [string, string][]) : []),
      ["Estado del pago", estado],
      ...(i.metodoPago ? ([["Método", METODO_PAGO[i.metodoPago]]] as [string, string][]) : []),
      ["Fecha", fecha(new Date())],
    ];

    await enviarCorreo({
      to: i.fiel.correo,
      tipo: "pago-curso",
      subject: habilita ? `Pago confirmado · ${i.curso.nombre}` : `Estado de tu pago · ${i.curso.nombre}`,
      html: plantillaCorreo(
        habilita ? "Pago confirmado" : "Estado de tu pago",
        `<p>Hola <strong>${esc(i.fiel.nombre)}</strong>,</p>
         <p>${intro}</p>
         ${tablaDatos(filas)}
         ${
           habilita
             ? "<p>En unos momentos recibirás otro correo con el acceso al curso.</p>"
             : "<p>Cuando el pago quede completo te daremos acceso al curso. Si tienes dudas, habla con el pastor o la administración.</p>"
         }`,
        { subtitulo: "Inscripciones y pagos" },
      ),
    });
  } catch (e) {
    console.error("[notificaciones] pago", e);
  }
}

/** Acceso a un curso nuevo (se llama al crear la matrícula). */
export async function notificarAccesoCurso(matriculaId: string) {
  try {
    const m = await prisma.matricula.findUnique({ where: { id: matriculaId }, include: { fiel: true, curso: true } });
    if (!m?.fiel.correo) return;
    await enviarCorreo({
      to: m.fiel.correo,
      tipo: "acceso-curso",
      subject: `¡Ya tienes acceso! Curso: ${m.curso.nombre}`,
      html: plantillaCorreo(
        "¡Bienvenido al curso!",
        `<p>Hola <strong>${esc(m.fiel.nombre)}</strong>,</p>
         <p>Ya tienes acceso al curso <strong>${esc(m.curso.nombre)}</strong>.</p>
         ${tablaDatos([
           ["Inicio", fecha(m.fechaInicio)],
           ["Disponible hasta", `${fecha(m.fechaVencimiento)} (${m.curso.duracionDias} días)`],
         ])}
         <p>Entra al espacio de estudio con tu usuario o tu número de documento. El curso aparece en el menú, en <strong>Mis cursos</strong>.</p>`,
        { boton: { texto: "Ir al curso", url: `/workspace/mis-cursos/${m.cursoId}` }, subtitulo: "Espacio de estudio" },
      ),
    });
  } catch (e) {
    console.error("[notificaciones] acceso", e);
  }
}
