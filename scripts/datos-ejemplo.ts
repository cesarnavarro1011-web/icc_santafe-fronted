/**
 * Datos de ejemplo TEMPORALES para probar el espacio de estudio.
 *
 *   npm run db:ejemplo              → borra los datos de ejemplo anteriores y los vuelve a crear
 *   npm run db:ejemplo -- --borrar  → solo los borra
 *
 * Todo queda marcado con "DEMO" (fieles F-DEMO…, cursos DEMO-…, grupos "DEMO …"),
 * así se borra sin tocar los datos reales. Contraseña de todos: Demo1234
 */
import { readdir, rm } from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import type { EstadoEntrega, Rol, TipoOfrenda, TipoServicio } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { carpetaFiel, guardarArchivo, storageRoot } from "../src/lib/server/storage";
import { recalcularMatricula } from "../src/server/academico";
import { calificar } from "../src/server/examenes";

const PASSWORD = "Demo1234";
const DIA = 86_400_000;

// Aleatorio reproducible (mismos datos en cada ejecución)
let semilla = 20260925;
const rnd = () => ((semilla = (semilla * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const entre = (a: number, b: number) => Math.floor(a + rnd() * (b - a + 1));
const alguno = <T>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];

const hoy = new Date();
const hoyUTC = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
const haceDias = (n: number) => new Date(hoyUTC.getTime() - n * DIA);
const lunes = new Date(hoyUTC.getTime() - ((hoyUTC.getUTCDay() + 6) % 7) * DIA);

// ── Borrar ───────────────────────────────────────────────────

async function borrar() {
  const demo = { codigo: { startsWith: "F-DEMO" } };
  const fieles = await prisma.fiel.findMany({ where: demo, select: { id: true } });
  const ids = fieles.map((f) => f.id);
  await prisma.registroOfrenda.deleteMany({ where: { OR: [{ registradoPorId: { in: ids } }, { descripcion: "DEMO" }] } });
  await prisma.asistenciaCongregacional.deleteMany({ where: { OR: [{ fielId: { in: ids } }, { nombreInvitado: "Invitado (demo)" }] } });
  await prisma.grupo.deleteMany({ where: { nombre: { startsWith: "DEMO" } } });
  await prisma.curso.deleteMany({ where: { codigo: { startsWith: "DEMO-" } } }); // actividades, matrículas, notas, sesiones…
  await prisma.fiel.deleteMany({ where: demo }); // usuarios, bautismos, cargos…
  // Archivos de ejemplo (PDF de tareas) en el disco
  const dir = path.join(storageRoot(), "fieles");
  for (const d of await readdir(dir).catch(() => [] as string[])) {
    if (d.startsWith("F-DEMO")) await rm(path.join(dir, d), { recursive: true, force: true });
  }
  // Matrículas de ejemplo de César (fiel real) ya se borraron con los cursos DEMO
  console.log(`✓ Datos de ejemplo borrados (${ids.length} fieles DEMO).`);
}

// ── Crear ────────────────────────────────────────────────────

async function pdfTarea(estudiante: string, actividad: string) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText("TAREA DE EJEMPLO (datos DEMO)", { x: 60, y: 760, size: 18, font });
  page.drawText(`Actividad: ${actividad}`, { x: 60, y: 720, size: 12, font });
  page.drawText(`Estudiante: ${estudiante}`, { x: 60, y: 700, size: 12, font });
  page.drawText("Este archivo fue generado automaticamente para probar el sistema.", { x: 60, y: 660, size: 11, font });
  return doc.save();
}

async function crear() {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const cargos = Object.fromEntries((await prisma.area.findMany()).map((a) => [a.nombre, a.id]));

  // Personas
  type P = { doc: string; nombre: string; apellido: string; usuario?: string; rol?: Rol; cargos?: string[]; bautizado?: boolean };
  const personas: P[] = [
    { doc: "01", nombre: "Andrés", apellido: "Supervisor", usuario: "demo.supervisor", rol: "SUPERVISOR", cargos: ["Maestro"], bautizado: true },
    { doc: "02", nombre: "María", apellido: "Maestra", usuario: "demo.maestro1", rol: "MAESTRO", cargos: ["Maestro"], bautizado: true },
    { doc: "03", nombre: "Jorge", apellido: "Maestro", usuario: "demo.maestro2", rol: "MAESTRO", cargos: ["Maestro", "Sonido"], bautizado: true },
    { doc: "04", nombre: "Laura", apellido: "Líder", usuario: "demo.lider1", rol: "LIDER", cargos: ["Líder", "Ministerio de alabanza"], bautizado: true },
    { doc: "05", nombre: "Carlos", apellido: "Líder", usuario: "demo.lider2", rol: "LIDER", cargos: ["Líder"], bautizado: true },
    { doc: "06", nombre: "Sofía", apellido: "Servidora", usuario: "demo.servidora", rol: "ESTUDIANTE", cargos: ["Ujier / servidor"], bautizado: true },
    ...["Valentina Rojas", "Santiago Gómez", "Isabella Díaz", "Mateo Herrera", "Camila Torres", "Samuel Castro", "Mariana Vargas", "Daniel Moreno", "Gabriela Ruiz", "Sebastián Ortiz"].map(
      (n, i): P => {
        const [nombre, apellido] = n.split(" ");
        return {
          doc: String(i + 7).padStart(2, "0"),
          nombre,
          apellido,
          usuario: `demo.estudiante${i + 1}`,
          rol: "ESTUDIANTE",
          cargos: [alguno(["Fiel", "Ministerio de danza", "Audiovisuales", "Ministerio infantil", "Fiel"])],
          bautizado: rnd() > 0.4,
        };
      },
    ),
    // Fieles sin acceso al sistema
    { doc: "17", nombre: "Rosa", apellido: "Visitante", cargos: ["Fiel"] },
    { doc: "18", nombre: "Pedro", apellido: "Nuevo" },
    { doc: "19", nombre: "Lucía", apellido: "Intercesora", cargos: ["Intercesión"], bautizado: true },
  ];

  const fiel: Record<string, { id: string; nombre: string; apellido: string; codigo: string }> = {};
  for (const p of personas) {
    const f = await prisma.fiel.create({
      data: {
        codigo: `F-DEMO${p.doc}`,
        nombre: p.nombre,
        apellido: p.apellido,
        correo: p.usuario ? `${p.usuario}@demo.local` : null,
        celular: `300${entre(1000000, 9999999)}`,
        fechaNacimiento: new Date(Date.UTC(entre(1970, 2008), entre(0, 11), entre(1, 28))),
        estadoCivil: alguno(["SOLTERO", "CASADO", "SOLTERO", "UNION_LIBRE"] as const),
        bautizado: !!p.bautizado,
        direccion: `Calle ${entre(1, 99)} # ${entre(1, 60)}-${entre(1, 99)}`,
        createdAt: haceDias(entre(0, 90)),
        usuario: p.usuario ? { create: { usuario: p.usuario, passwordHash: hash, rol: p.rol!, debeCambiarPassword: false } } : undefined,
        areas: { create: (p.cargos ?? []).filter((c) => cargos[c]).map((c) => ({ areaId: cargos[c] })) },
      },
    });
    fiel[p.usuario ?? p.doc] = f;
  }
  const estudiantes = Array.from({ length: 10 }, (_, i) => fiel[`demo.estudiante${i + 1}`]);
  // César (fiel real, rol estudiante) también se inscribe para ver la vista del estudiante
  const cesar = await prisma.fiel.findUnique({ where: { codigo: "F-1004355591" } });

  // Grupos y cronograma
  const jovenes = await prisma.grupo.create({ data: { nombre: "DEMO Jóvenes", liderId: fiel["demo.lider1"].id, descripcion: "Grupo de ejemplo" } });
  const matrimonios = await prisma.grupo.create({ data: { nombre: "DEMO Matrimonios", liderId: fiel["demo.lider2"].id, descripcion: "Grupo de ejemplo" } });
  const miembrosJ = [fiel["demo.lider1"], fiel["demo.servidora"], ...estudiantes.slice(0, 5), fiel["17"]];
  const miembrosM = [fiel["demo.lider2"], ...estudiantes.slice(5), fiel["18"], fiel["19"]];
  await prisma.fiel.updateMany({ where: { id: { in: miembrosJ.map((f) => f.id) } }, data: { grupoId: jovenes.id } });
  await prisma.fiel.updateMany({ where: { id: { in: miembrosM.map((f) => f.id) } }, data: { grupoId: matrimonios.id } });
  for (let i = -2; i < 6; i++) {
    const semana = new Date(lunes.getTime() + i * 7 * DIA);
    const ocupada = await prisma.turnoAsistencia.count({ where: { semana } });
    if (!ocupada) await prisma.turnoAsistencia.create({ data: { semana, grupoId: (i + 10) % 2 === 0 ? jovenes.id : matrimonios.id } });
  }

  // Cursos
  type Act = { nivel: number; tipo: "TAREA" | "EXAMEN" | "MATERIAL"; nombre: string; instrucciones: string; preguntas?: [string, string][] };
  const planes: { codigo: string; nombre: string; descripcion: string; nivel: number; costo: number; dias: number[]; ini: string; fin: string; maestro: string; acts: Act[] }[] = [
    {
      codigo: "DEMO-FUND",
      nombre: "Fundamentos de la fe",
      descripcion: "Las bases de la vida cristiana: salvación, oración, la Biblia y la iglesia.",
      nivel: 1,
      costo: 0,
      dias: [3, 5],
      ini: "18:00",
      fin: "20:00",
      maestro: "demo.maestro1",
      acts: [
        { nivel: 1, tipo: "MATERIAL", nombre: "Lectura: ¿Qué es la salvación?", instrucciones: "Lee Juan 3 y Romanos 10 antes de la clase." },
        { nivel: 1, tipo: "TAREA", nombre: "Mi testimonio", instrucciones: "Escribe en una página cómo conociste a Jesús y súbela en PDF." },
        { nivel: 1, tipo: "TAREA", nombre: "Plan de lectura semanal", instrucciones: "Arma tu plan de lectura de la Biblia para 4 semanas." },
        {
          nivel: 1,
          tipo: "EXAMEN",
          nombre: "Examen nivel 1",
          instrucciones: "Responde con una o pocas palabras.",
          preguntas: [
            ["¿Cuántos libros tiene la Biblia?", "66"],
            ["¿Quién escribió la carta a los Romanos?", "Pablo"],
            ["¿En qué ciudad nació Jesús?", "Belén"],
            ["¿Cuál es el primer libro de la Biblia?", "Génesis"],
          ],
        },
        { nivel: 2, tipo: "TAREA", nombre: "La oración en mi vida", instrucciones: "Describe cómo es tu tiempo de oración diario." },
        {
          nivel: 2,
          tipo: "EXAMEN",
          nombre: "Examen nivel 2",
          instrucciones: "Examen final del curso.",
          preguntas: [
            ["¿Cuántos evangelios hay?", "Cuatro"],
            ["¿Quién negó a Jesús tres veces?", "Pedro"],
            ["¿Qué oración enseñó Jesús a sus discípulos?", "Padre nuestro"],
          ],
        },
      ],
    },
    {
      codigo: "DEMO-DISC",
      nombre: "Discipulado 1",
      descripcion: "Crece como discípulo: carácter, servicio y vida en comunidad.",
      nivel: 2,
      costo: 50000,
      dias: [6],
      ini: "09:00",
      fin: "11:00",
      maestro: "demo.maestro1",
      acts: [
        { nivel: 1, tipo: "TAREA", nombre: "Frutos del Espíritu", instrucciones: "Explica con ejemplos tres frutos del Espíritu (Gálatas 5)." },
        {
          nivel: 1,
          tipo: "EXAMEN",
          nombre: "Evaluación de discipulado",
          instrucciones: "Responde brevemente.",
          preguntas: [
            ["¿Cuántos discípulos eligió Jesús?", "Doce"],
            ["¿Qué libro narra el inicio de la iglesia?", "Hechos"],
            ["¿Cuál es el mayor mandamiento según Jesús?", "Amar a Dios"],
          ],
        },
      ],
    },
    {
      codigo: "DEMO-LIDER",
      nombre: "Escuela de líderes",
      descripcion: "Formación para quienes guían grupos: visión, cuidado pastoral y organización.",
      nivel: 3,
      costo: 80000,
      dias: [2, 4],
      ini: "19:00",
      fin: "21:00",
      maestro: "demo.maestro2",
      acts: [
        { nivel: 1, tipo: "TAREA", nombre: "Visión de mi grupo", instrucciones: "Redacta la visión y 3 metas para tu grupo." },
        { nivel: 1, tipo: "EXAMEN", nombre: "Examen de liderazgo", instrucciones: "Examen corto.", preguntas: [["¿Quién guio al pueblo fuera de Egipto?", "Moisés"], ["¿Quién sucedió a Moisés?", "Josué"]] },
      ],
    },
  ];

  const cursos: Record<string, { id: string; actividades: { id: string; nivel: number; tipo: string; nombre: string; notaMax: number }[] }> = {};
  for (const c of planes) {
    const curso = await prisma.curso.create({
      data: {
        codigo: c.codigo,
        nombre: c.nombre,
        descripcion: c.descripcion,
        nivel: c.nivel,
        costo: c.costo,
        duracionDias: 90,
        diasClase: c.dias,
        horaInicio: c.ini,
        horaFin: c.fin,
        maestros: { create: [{ fielId: fiel[c.maestro].id, rol: "TITULAR" }] },
        supervisores: { create: [{ fielId: fiel["demo.supervisor"].id }] },
      },
    });
    const actividades = [];
    for (const [i, a] of c.acts.entries()) {
      const act = await prisma.actividad.create({
        data: { codigo: `ACT-DEMO-${c.codigo.slice(5)}-${i + 1}`, cursoId: curso.id, nivel: a.nivel, tipo: a.tipo, nombre: a.nombre, instrucciones: a.instrucciones, orden: i },
      });
      for (const [j, [pregunta, respuesta]] of (a.preguntas ?? []).entries()) {
        await prisma.pregunta.create({
          data: { codigo: `PQ-DEMO-${c.codigo.slice(5)}-${i + 1}-${j + 1}`, cursoId: curso.id, nivel: a.nivel, actividadId: act.id, pregunta, respuestaCorrecta: respuesta, puntos: 1 },
        });
      }
      actividades.push(act);
    }
    cursos[c.codigo] = { id: curso.id, actividades };
  }

  // Inscripciones y matrículas
  const inscribir = async (f: { id: string }, codigo: string, dias: number, estadoPago: "COMPLETADO" | "EXENTO" | "PENDIENTE") => {
    const plan = planes.find((p) => p.codigo === codigo)!;
    await prisma.inscripcion.create({
      data: {
        codigo: `INS-DEMO-${Math.floor(rnd() * 1e8)}`,
        fielId: f.id,
        cursoId: cursos[codigo].id,
        fecha: haceDias(dias),
        costoTotal: plan.costo,
        montoPagado: estadoPago === "COMPLETADO" ? plan.costo : 0,
        estadoPago: plan.costo === 0 && estadoPago === "COMPLETADO" ? "EXENTO" : estadoPago,
        metodoPago: estadoPago === "PENDIENTE" ? null : plan.costo ? alguno(["EFECTIVO", "TRANSFERENCIA", "NEQUI"] as const) : "EXENTO",
      },
    });
    if (estadoPago === "PENDIENTE") return null;
    return prisma.matricula.create({
      data: {
        codigo: `MAT-DEMO-${Math.floor(rnd() * 1e8)}`,
        fielId: f.id,
        cursoId: cursos[codigo].id,
        maestroId: fiel[plan.maestro].id,
        supervisorId: fiel["demo.supervisor"].id,
        fechaInicio: haceDias(dias),
        fechaVencimiento: new Date(haceDias(dias).getTime() + 90 * DIA),
      },
    });
  };

  const matriculas: { m: { id: string; fielId: string; cursoId: string }; codigo: string; avance: number; nombre: string }[] = [];
  const alumnos: [typeof estudiantes[number], string, number][] = [
    ...estudiantes.slice(0, 8).map((e, i) => [e, "DEMO-FUND", [1, 0.9, 0.75, 0.6, 0.5, 0.4, 0.25, 0.1][i]] as [typeof e, string, number]),
    ...estudiantes.slice(2, 7).map((e, i) => [e, "DEMO-DISC", [1, 0.5, 0.5, 0, 0.3][i]] as [typeof e, string, number]),
    [fiel["demo.lider1"], "DEMO-LIDER", 0.5],
    [fiel["demo.lider2"], "DEMO-LIDER", 1],
    [estudiantes[0], "DEMO-LIDER", 0],
  ];
  if (cesar) alumnos.push([cesar, "DEMO-FUND", 0.3], [cesar, "DEMO-DISC", 0]);
  for (const [f, codigo, avance] of alumnos) {
    const m = await inscribir(f, codigo, entre(35, 60), "COMPLETADO");
    if (m) matriculas.push({ m, codigo, avance, nombre: `${f.nombre} ${f.apellido}` });
  }
  // Solicitudes pendientes (aparecen en Inscripciones y pagos)
  await inscribir(estudiantes[8], "DEMO-DISC", 2, "PENDIENTE");
  await inscribir(estudiantes[9], "DEMO-LIDER", 1, "PENDIENTE");

  // Clases dictadas según el horario (últimas 5 semanas). La asistencia es proporcional al
  // avance: quien completó todo asistió a casi todas las clases, quien va empezando faltó más.
  for (const plan of planes) {
    const inscritos = matriculas.filter((x) => x.codigo === plan.codigo);
    const fechas: Date[] = [];
    for (let d = 35; d >= 1; d--) if (plan.dias.includes(haceDias(d).getUTCDay())) fechas.push(haceDias(d));
    const asiste = new Map<string, Set<number>>();
    for (const x of inscritos) {
      const pct = x.avance >= 1 ? 1 : 0.5 + 0.45 * x.avance; // 50 % … 95 %, 100 % si terminó
      const cuantas = Math.round(fechas.length * pct);
      // Falla primero en las clases más recientes (va quedándose atrás)
      asiste.set(x.m.id, new Set(Array.from({ length: cuantas }, (_, i) => i)));
    }
    for (const [i, fecha] of fechas.entries()) {
      const presentes = inscritos.filter((x) => asiste.get(x.m.id)!.has(i));
      if (!presentes.length) continue;
      await prisma.sesionClase.create({
        data: {
          cursoId: cursos[plan.codigo].id,
          nivel: 1,
          fecha,
          tema: "Clase de ejemplo",
          asistencias: { create: presentes.map((x) => ({ fielId: x.m.fielId })) },
        },
      });
    }
  }

  // Tareas, exámenes y notas según el avance de cada alumno
  const certificables: typeof matriculas = [];
  for (const x of matriculas) {
    const evaluables = cursos[x.codigo].actividades.filter((a) => a.tipo !== "MATERIAL");
    const hechas = Math.round(evaluables.length * x.avance);
    const plan = planes.find((p) => p.codigo === x.codigo)!;
    const f = Object.values(fiel).find((ff) => ff.id === x.m.fielId) ?? cesar!;
    for (const [i, act] of evaluables.slice(0, hechas + 1).entries()) {
      const calificada = i < hechas;
      if (act.tipo === "TAREA") {
        const ruta = await guardarArchivo(`${carpetaFiel(f)}/cursos/${plan.codigo}/${act.id}.pdf`, await pdfTarea(x.nombre, act.nombre));
        const nota = Math.round((5 + rnd() * 5) * 10) / 10;
        const estado: EstadoEntrega = calificada ? (nota >= 6 ? "APROBADA" : "REPROBADA") : "ENVIADA";
        const entrega = await prisma.entrega.create({
          data: {
            matriculaId: x.m.id,
            fielId: x.m.fielId,
            actividadId: act.id,
            archivoPath: ruta,
            archivoNombre: "tarea.pdf",
            estado,
            fechaEntrega: haceDias(entre(3, 25)),
            ...(calificada
              ? { comentario: nota >= 8 ? "¡Excelente trabajo!" : nota >= 6 ? "Bien, puedes profundizar más." : "Revisa las instrucciones y vuelve a intentarlo.", revisadoPorId: fiel[plan.maestro].id, revisadoAt: haceDias(entre(1, 3)) }
              : {}),
          },
        });
        if (calificada) {
          await prisma.nota.create({ data: { matriculaId: x.m.id, fielId: x.m.fielId, actividadId: act.id, entregaId: entrega.id, nota, notaMax: 10, comentario: entrega.comentario } });
        }
      } else if (calificada) {
        const preguntas = await prisma.pregunta.findMany({ where: { actividadId: act.id } });
        const respuestas = Object.fromEntries(preguntas.map((p) => [p.id, rnd() < 0.75 ? p.respuestaCorrecta.toLowerCase() : "no sé"]));
        const r = calificar(preguntas, respuestas);
        const intento = await prisma.intentoExamen.create({
          data: { matriculaId: x.m.id, fielId: x.m.fielId, actividadId: act.id, detalle: r.detalle, puntosObtenidos: r.obtenidos, puntosTotal: r.total, notaAutomatica: r.nota, createdAt: haceDias(entre(1, 20)) },
        });
        await prisma.nota.create({ data: { matriculaId: x.m.id, fielId: x.m.fielId, actividadId: act.id, intentoExamenId: intento.id, nota: r.nota, notaMax: 10 } });
      }
    }
    const final = await recalcularMatricula(x.m.id);
    if (final.estado === "APROBADO") certificables.push(x);
  }

  // Certificados: uno espera al supervisor, otro al pastor, otro ya emitido (sin PDF)
  for (const [i, x] of certificables.slice(0, 3).entries()) {
    const plan = planes.find((p) => p.codigo === x.codigo)!;
    await prisma.certificado.create({
      data: {
        codigo: `CERT-DEMO-${i + 1}`,
        fielId: x.m.fielId,
        cursoId: x.m.cursoId,
        matriculaId: x.m.id,
        firmaMaestroId: fiel[plan.maestro].id,
        firmaMaestroAt: haceDias(6),
        ...(i >= 1 ? { firmaSupervisorId: fiel["demo.supervisor"].id, firmaSupervisorAt: haceDias(4) } : {}),
        ...(i === 2 ? { firmaPastorAt: haceDias(1), estado: "EMITIDO" as const, emitidoAt: haceDias(1) } : {}),
      },
    });
  }

  // Asistencia de la iglesia: domingos y miércoles de las últimas 5 semanas
  const congregacion = Object.values(fiel);
  for (let d = 35; d >= 0; d--) {
    const fecha = haceDias(d);
    const dia = fecha.getUTCDay();
    if (dia !== 0 && dia !== 3) continue;
    const servicio: TipoServicio = dia === 0 ? "DOMINGO" : "MIERCOLES";
    const semana = new Date(fecha.getTime() - ((dia + 6) % 7) * DIA);
    const turno = await prisma.turnoAsistencia.findFirst({ where: { semana }, include: { grupo: true } });
    const registra = turno?.grupo.liderId ?? fiel["demo.lider1"].id;
    const hora = new Date(fecha.getTime() + (dia === 0 ? 15 : 24) * 3600_000);
    const presentes = congregacion.filter(() => rnd() < (dia === 0 ? 0.8 : 0.5));
    await prisma.asistenciaCongregacional.createMany({
      data: [
        ...presentes.map((f) => ({ fecha: hora, fielId: f.id, servicio, registradoPorId: registra })),
        ...Array.from({ length: entre(1, 4) }, () => ({ fecha: hora, nombreInvitado: "Invitado (demo)", servicio, registradoPorId: registra })),
      ],
    });
  }

  // Diezmos y ofrendas de los domingos y miércoles de los últimos 2 meses
  for (let d = 60; d >= 0; d--) {
    const fecha = haceDias(d);
    const dia = fecha.getUTCDay();
    if (dia !== 0 && dia !== 3) continue;
    const lider = rnd() < 0.5 ? fiel["demo.lider1"] : fiel["demo.lider2"];
    const grupoId = lider.id === fiel["demo.lider1"].id ? jovenes.id : matrimonios.id;
    const tipos: [TipoOfrenda, number, number][] =
      dia === 0
        ? [["DIEZMO", 600, 1500], ["OFRENDA", 150, 400], ["PRIMICIA", 0, 200], ["MISIONES", 0, 120]]
        : [["OFRENDA", 60, 180], ["ACCION_GRACIAS", 0, 80]];
    for (const [tipo, min, max] of tipos) {
      const monto = entre(min, max) * 1000;
      if (!monto) continue;
      const estado = d > 14 ? (rnd() < 0.9 ? "VERIFICADO" : "OBSERVADO") : "PENDIENTE";
      await prisma.registroOfrenda.create({
        data: {
          fecha,
          servicio: dia === 0 ? "DOMINGO" : "MIERCOLES",
          tipo,
          metodo: rnd() < 0.7 ? "EFECTIVO" : "TRANSFERENCIA",
          monto,
          registradoPorId: lider.id,
          grupoId,
          estado,
          descripcion: "DEMO",
          observacion: estado === "OBSERVADO" ? "El conteo físico no coincide, revisar con tesorería." : null,
          verificadoAt: estado === "PENDIENTE" ? null : new Date(fecha.getTime() + 2 * DIA),
        },
      });
    }
  }

  // Bautismos
  for (const f of [estudiantes[1], estudiantes[3], fiel["19"]]) {
    await prisma.bautismo.create({ data: { fielId: f.id, fecha: haceDias(entre(20, 200)), ministro: "Pastor de la iglesia", lugar: "Piscina de la sede", tipo: "AGUA" } });
    await prisma.fiel.update({ where: { id: f.id }, data: { bautizado: true } });
  }

  console.log(`✓ Datos de ejemplo creados: ${personas.length} fieles, ${planes.length} cursos, ${matriculas.length} matrículas, ${certificables.length} aprobados.`);
  console.log(`\nUsuarios (contraseña para todos: ${PASSWORD}):`);
  for (const p of personas.filter((x) => x.usuario)) console.log(`  ${p.usuario!.padEnd(20)} ${p.rol}`);
  if (cesar) console.log(`\nCésar (F-1004355591) quedó inscrito en "Fundamentos de la fe" y "Discipulado 1".`);
  console.log("\nPara borrar todo: npm run db:ejemplo -- --borrar");
}

async function main() {
  await borrar();
  if (!process.argv.includes("--borrar")) await crear();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
