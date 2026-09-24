/**
 * Importa el Excel del sistema anterior (Google Sheets) a PostgreSQL.
 *
 *   npm run db:importar -- "C:\ruta\Software  Para iglesia.xlsx"
 *
 * Es idempotente: usa los códigos del sistema anterior (F-..., TEOL-1, MAT-...)
 * como llave, así que se puede ejecutar varias veces sin duplicar registros.
 * Las contraseñas SHA-256 se conservan y se convierten a bcrypt en el primer login.
 */
import ExcelJS from "exceljs";
import { PrismaClient, type Prisma, type Rol } from "@prisma/client";
import { createHash, randomInt } from "crypto";

const prisma = new PrismaClient();
const avisos: string[] = [];
const conteo: Record<string, number> = {};
const sumar = (k: string) => (conteo[k] = (conteo[k] ?? 0) + 1);
const avisar = (m: string) => avisos.push(m);

// ── Lectura de hojas ─────────────────────────────────────────

type Fila = Record<string, unknown>;

/** "Dirección" → "direccion", "Progreso_%" → "progreso", "Tipo (Agua/Espíritu)" → "tipoaguaespiritu" */
const clave = (h: string) =>
  h
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

function valorCelda(v: ExcelJS.CellValue): unknown {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("result" in v) return valorCelda(v.result as ExcelJS.CellValue); // fórmula
    if ("text" in v && typeof v.text === "string") return v.text; // hipervínculo
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("error" in v) return null;
  }
  return v;
}

function leerHoja(wb: ExcelJS.Workbook, nombre: string): Fila[] {
  const ws = wb.getWorksheet(nombre);
  if (!ws) {
    avisar(`Hoja "${nombre}" no encontrada (se omite).`);
    return [];
  }
  const headers: string[] = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (c, col) => (headers[col] = clave(String(valorCelda(c.value) ?? ""))));
  const filas: Fila[] = [];
  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n === 1) return;
    const f: Fila = {};
    let vacia = true;
    row.eachCell({ includeEmpty: true }, (c, col) => {
      const k = headers[col];
      if (!k) return;
      const v = valorCelda(c.value);
      if (v !== null && String(v).trim() !== "") vacia = false;
      f[k] = v;
    });
    if (!vacia) filas.push(f);
  });
  return filas;
}

// ── Conversión de valores ────────────────────────────────────

const texto = (v: unknown) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

const numero = (v: unknown, def = 0) => {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v ?? "").replace(/[^0-9.,-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : def;
};

/** Acepta Date, "28/03/2000 5:00 p.m.", "2026-04-02". */
function fecha(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") return new Date(Math.round((v - 25569) * 86400 * 1000)); // serial de Excel
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*([ap])?\.?\s*m?\.?)?/i);
  if (m) {
    let h = Number(m[4] ?? 12);
    if (m[6]?.toLowerCase() === "p" && h < 12) h += 12;
    if (m[6]?.toLowerCase() === "a" && h === 12) h = 0;
    return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), h + 5, Number(m[5] ?? 0))); // hora Colombia
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

const norm = (v: unknown) => clave(String(v ?? ""));
const esUrl = (v: unknown) => typeof v === "string" && /^https?:\/\//i.test(v.trim()) && !v.includes("...");
const siNo = (v: unknown) => ["si", "true", "1", "activo"].includes(norm(v));

const ESTADO_CIVIL = { soltero: "SOLTERO", casado: "CASADO", divorciado: "DIVORCIADO", viudo: "VIUDO", unionlibre: "UNION_LIBRE" } as const;
const SERVICIO = { domingo: "DOMINGO", miercoles: "MIERCOLES", gv: "GV", especial: "ESPECIAL" } as const;
const TIPO_ACT = { tarea: "TAREA", examen: "EXAMEN", material: "MATERIAL", clase: "CLASE" } as const;
const PAGO = { pendiente: "PENDIENTE", abono: "ABONO", completado: "COMPLETADO", exento: "EXENTO" } as const;
const METODO = { efectivo: "EFECTIVO", transferencia: "TRANSFERENCIA", nequi: "NEQUI", daviplata: "DAVIPLATA", exento: "EXENTO" } as const;
const ESTADO_MAT = { enprogreso: "EN_PROGRESO", aprobado: "APROBADO", aprobadomaestro: "APROBADO", reprobado: "REPROBADO", vencido: "VENCIDO", retirado: "RETIRADO" } as const;
const ENTREGA = { enviada: "ENVIADA", pendiente: "ENVIADA", aprobada: "APROBADA", reprobada: "REPROBADA", devuelta: "DEVUELTA" } as const;
/** En el sistema anterior "Líder" hacía la supervisión académica (Supervisores_Niveles, firma de certificados). */
const ROL: Record<string, Rol> = { superadmin: "SUPERADMIN", pastor: "PASTOR", supervisor: "SUPERVISOR", lider: "SUPERVISOR", maestro: "MAESTRO", estudiante: "ESTUDIANTE" };

function mapa<T extends Record<string, string>>(m: T, v: unknown): T[keyof T] | undefined {
  return m[norm(v) as keyof T];
}

const sufijo = () => `${Date.now().toString().slice(-6)}${randomInt(10, 100)}`;

// ── Importación ──────────────────────────────────────────────

async function main() {
  const archivo = process.argv[2];
  if (!archivo) {
    console.error('Uso: npm run db:importar -- "C:\\ruta\\archivo.xlsx"');
    process.exit(1);
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(archivo);
  console.log(`Leyendo ${archivo}\n`);

  const fielPorCodigo = new Map<string, string>();
  const cursoPorCodigo = new Map<string, string>();
  const fielId = (codigo: unknown, hoja: string) => {
    const c = texto(codigo);
    if (!c || norm(c) === "invitado") return null;
    const id = fielPorCodigo.get(c.toUpperCase());
    if (!id) avisar(`[${hoja}] fiel "${c}" no existe en la hoja Fieles (fila omitida).`);
    return id ?? null;
  };
  const cursoId = (codigo: unknown, hoja: string) => {
    const c = texto(codigo);
    if (!c) return null;
    const id = cursoPorCodigo.get(c.toUpperCase());
    if (!id) avisar(`[${hoja}] curso "${c}" no existe en Cursos_Catalogo (fila omitida).`);
    return id ?? null;
  };

  // Fieles
  for (const f of leerHoja(wb, "Fieles")) {
    const codigo = texto(f.id)?.toUpperCase();
    if (!codigo || !texto(f.nombre)) continue;
    const data = {
      nombre: texto(f.nombre)!,
      apellido: texto(f.apellido) ?? "",
      fechaNacimiento: fecha(f.fechadenacimiento),
      estadoCivil: mapa(ESTADO_CIVIL, f.estadocivil) ?? null,
      bautizado: siNo(f.bautizado),
      celular: texto(f.celular),
      direccion: texto(f.direccion),
      correo: texto(f.correo)?.toLowerCase() ?? null,
      estado: norm(f.estado) === "inactivo" ? ("INACTIVO" as const) : ("ACTIVO" as const),
    };
    const r = await prisma.fiel.upsert({
      where: { codigo },
      create: { codigo, ...data, createdAt: fecha(f.fecha) ?? undefined },
      update: data,
    });
    fielPorCodigo.set(codigo, r.id);
    sumar("fieles");
  }
  for (const f of await prisma.fiel.findMany({ select: { id: true, codigo: true } })) fielPorCodigo.set(f.codigo.toUpperCase(), f.id);

  // Credenciales
  for (const c of leerHoja(wb, "Credenciales_Acceso")) {
    const fid = fielId(c.idfiel, "Credenciales_Acceso");
    const usuario = texto(c.usuario);
    const pass = texto(c.contrasena);
    if (!fid || !usuario || !pass) continue;
    // SHA-256 del sistema anterior; si la celda tuviera una clave en texto plano, se hashea igual
    const sha = /^[a-f0-9]{64}$/i.test(pass) ? pass.toLowerCase() : createHash("sha256").update(pass).digest("hex");
    const passwordHash = `sha256:${sha}`;
    const rol = ROL[norm(c.rol)] ?? "ESTUDIANTE";
    const data = { usuario, passwordHash, rol, debeCambiarPassword: siNo(c.temp), activo: !["inactivo", "false", "0"].includes(norm(c.activo)) };
    const porUsuario = await prisma.usuario.findUnique({ where: { usuario } });
    if (porUsuario && porUsuario.fielId !== fid) {
      avisar(`[Credenciales_Acceso] el usuario "${usuario}" ya pertenece a otro fiel (omitido).`);
      continue;
    }
    await prisma.usuario.upsert({ where: { fielId: fid }, create: { fielId: fid, ...data }, update: data });
    sumar("usuarios");
  }

  // Cursos
  for (const c of leerHoja(wb, "Cursos_Catalogo")) {
    const codigo = texto(c.idcurso)?.toUpperCase();
    if (!codigo) continue;
    const data = {
      nombre: texto(c.nombrecurso)?.replace(/\s+/g, " ") ?? codigo,
      nivel: c.nivel ? Math.round(numero(c.nivel)) : null,
      descripcion: texto(c.descripcion),
      estado: norm(c.estado) === "inactivo" ? ("INACTIVO" as const) : ("ACTIVO" as const),
      duracionDias: c.duraciondias ? Math.round(numero(c.duraciondias, 90)) : 90,
      costo: c.costo ? numero(c.costo) : 0,
    };
    const r = await prisma.curso.upsert({ where: { codigo }, create: { codigo, ...data }, update: data });
    cursoPorCodigo.set(codigo, r.id);
    sumar("cursos");
  }
  for (const c of await prisma.curso.findMany({ select: { id: true, codigo: true } })) cursoPorCodigo.set(c.codigo.toUpperCase(), c.id);

  // Actividades
  for (const a of leerHoja(wb, "Catalogo_Actividades")) {
    const cid = cursoId(a.idcurso, "Catalogo_Actividades");
    const nombre = texto(a.nombreactividad);
    if (!cid || !nombre) continue;
    const codigo = texto(a.idactividad) ?? `ACT-${sufijo()}`;
    // Algunas filas guardaron Nota_Max y Porcentaje_Peso en las columnas de link e instrucciones
    const linkNumerico = typeof a.linkmaterial === "number";
    const data = {
      cursoId: cid,
      nivel: Math.max(1, Math.round(numero(a.nivel, 1))),
      tipo: mapa(TIPO_ACT, a.tipo) ?? "TAREA",
      nombre,
      linkMaterial: esUrl(a.linkmaterial) ? String(a.linkmaterial).trim() : null,
      instrucciones: typeof a.instrucciones === "string" ? a.instrucciones.trim() : null,
      notaMax: linkNumerico ? numero(a.linkmaterial, 10) : 10,
      peso: typeof a.instrucciones === "number" ? a.instrucciones : 100,
    };
    await prisma.actividad.upsert({ where: { codigo }, create: { codigo, ...data, createdAt: fecha(a.fecha) ?? undefined }, update: data });
    sumar("actividades");
  }

  // Maestros y supervisores
  for (const m of leerHoja(wb, "Maestros_Asignados")) {
    const fid = fielId(m.idfielmaestro, "Maestros_Asignados");
    const cid = cursoId(m.idcurso, "Maestros_Asignados");
    if (!fid || !cid) continue;
    const nivel = m.nivel ? Math.round(numero(m.nivel)) : null;
    const existe = await prisma.asignacionMaestro.findFirst({ where: { fielId: fid, cursoId: cid, nivel } });
    if (!existe) {
      await prisma.asignacionMaestro.create({
        data: { fielId: fid, cursoId: cid, nivel, rol: norm(m.rol) === "auxiliar" ? "AUXILIAR" : "TITULAR" },
      });
    }
    sumar("maestros asignados");
  }
  for (const s of leerHoja(wb, "Supervisores_Niveles")) {
    const fid = fielId(s.idsupervisor ?? s.idfiellider, "Supervisores_Niveles");
    const cid = cursoId(s.idcurso, "Supervisores_Niveles");
    if (!fid || !cid) continue;
    const data = {
      nivelAutorizado: texto(s.nivelautorizado ?? s.nivelsupervisado) ?? "Todos",
      estado: norm(s.estado) === "inactivo" ? ("INACTIVO" as const) : ("ACTIVO" as const),
    };
    await prisma.asignacionSupervisor.upsert({
      where: { fielId_cursoId: { fielId: fid, cursoId: cid } },
      create: { fielId: fid, cursoId: cid, ...data },
      update: data,
    });
    sumar("supervisores asignados");
  }

  // Inscripciones y pagos
  for (const p of leerHoja(wb, "Inscripciones_Pagos")) {
    const codigo = texto(p.idinscripcion);
    const fid = fielId(p.idfiel, "Inscripciones_Pagos");
    const cid = cursoId(p.idcurso, "Inscripciones_Pagos");
    if (!codigo || !fid || !cid) continue;
    const data = {
      fielId: fid,
      cursoId: cid,
      fecha: fecha(p.fecharegistro) ?? fecha(p.fecha) ?? new Date(),
      costoTotal: numero(p.costototal),
      montoPagado: numero(p.montopagado),
      estadoPago: mapa(PAGO, p.estadopago) ?? "PENDIENTE",
      metodoPago: mapa(METODO, p.metodopago) ?? null,
    };
    await prisma.inscripcion.upsert({ where: { codigo }, create: { codigo, ...data }, update: data });
    sumar("inscripciones");
  }

  // Matrículas (Control_Academico)
  const matriculaDe = new Map<string, string>(); // "fielId|cursoId" → matriculaId
  for (const m of leerHoja(wb, "Control_Academico")) {
    const fid = fielId(m.idfiel, "Control_Academico");
    const cid = cursoId(m.idcurso, "Control_Academico");
    if (!fid || !cid) continue;
    const maestro = texto(m.idmaestro);
    const lider = texto(m.idlider);
    const inicio = fecha(m.fechainicio) ?? fecha(m.fecha) ?? new Date();
    const data: Prisma.MatriculaUncheckedUpdateInput = {
      maestroId: maestro ? (fielPorCodigo.get(maestro.toUpperCase()) ?? null) : null,
      supervisorId: lider ? (fielPorCodigo.get(lider.toUpperCase()) ?? null) : null,
      fechaInicio: inicio,
      fechaVencimiento: fecha(m.fechavencimiento) ?? new Date(inicio.getTime() + 90 * 86_400_000),
      progreso: Math.round(numero(m.progreso)),
      notaFinal: numero(m.notafinal),
      estado: mapa(ESTADO_MAT, m.estado) ?? "EN_PROGRESO",
      aprobadoMaestroAt: norm(m.estado) === "aprobadomaestro" ? inicio : undefined,
    };
    const r = await prisma.matricula.upsert({
      where: { fielId_cursoId: { fielId: fid, cursoId: cid } },
      create: { codigo: texto(m.idmatricula) ?? `MAT-${sufijo()}`, fielId: fid, cursoId: cid, ...(data as object) },
      update: data,
    });
    matriculaDe.set(`${fid}|${cid}`, r.id);
    sumar("matrículas");
  }
  const buscarActividad = async (cid: string, nombre: string | null, tipo?: "TAREA" | "EXAMEN") =>
    nombre
      ? prisma.actividad.findFirst({ where: { cursoId: cid, nombre: { equals: nombre, mode: "insensitive" }, ...(tipo ? { tipo } : {}) } })
      : null;

  // Entregas de tareas (los exámenes con JSON no se migran: se vuelven a presentar)
  for (const e of leerHoja(wb, "Entregas_Tareas")) {
    const fid = fielId(e.idfiel, "Entregas_Tareas");
    const cid = cursoId(e.idcurso, "Entregas_Tareas");
    if (!fid || !cid) continue;
    const nombre = texto(e.nombreactividad);
    const link = texto(e.linktarearesuelta);
    if (norm(nombre) === "examen" || link?.startsWith("[")) {
      avisar(`[Entregas_Tareas] examen de ${e.idfiel} en ${e.idcurso} no migrado (el detalle era JSON; la nota sí se importa desde Notas_Detalle).`);
      continue;
    }
    const matriculaId = matriculaDe.get(`${fid}|${cid}`);
    const act = await buscarActividad(cid, nombre, "TAREA");
    if (!matriculaId || !act) {
      avisar(`[Entregas_Tareas] entrega "${nombre}" de ${e.idfiel}: sin matrícula o actividad (omitida).`);
      continue;
    }
    const fechaEntrega = fecha(e.fechaentrega) ?? new Date();
    const existe = await prisma.entrega.findFirst({ where: { matriculaId, actividadId: act.id, fechaEntrega } });
    if (!existe) {
      await prisma.entrega.create({
        data: {
          matriculaId,
          fielId: fid,
          actividadId: act.id,
          linkExterno: esUrl(link) ? link : null,
          estado: mapa(ENTREGA, e.estadorevision) ?? "ENVIADA",
          fechaEntrega,
        },
      });
    }
    sumar("entregas");
  }

  // Notas
  for (const n of leerHoja(wb, "Notas_Detalle")) {
    const fid = fielId(n.idfiel, "Notas_Detalle");
    const cid = cursoId(n.idcurso, "Notas_Detalle");
    if (!fid || !cid || n.nota === null || n.nota === undefined) continue;
    const matriculaId = matriculaDe.get(`${fid}|${cid}`);
    const nombre = texto(n.nombreactividad);
    const act =
      (await buscarActividad(cid, nombre)) ??
      (norm(nombre) === "examen" ? await prisma.actividad.findFirst({ where: { cursoId: cid, tipo: "EXAMEN" } }) : null);
    if (!matriculaId || !act) {
      avisar(`[Notas_Detalle] nota "${nombre}" de ${n.idfiel}: sin matrícula o actividad (omitida).`);
      continue;
    }
    const data = { fielId: fid, nota: numero(n.nota), notaMax: numero(n.notamax, 10) || 10, comentario: texto(n.comentarios), fecha: fecha(n.fechaentrega) ?? new Date() };
    await prisma.nota.upsert({
      where: { matriculaId_actividadId: { matriculaId, actividadId: act.id } },
      create: { matriculaId, actividadId: act.id, ...data },
      update: data,
    });
    sumar("notas");
  }

  // Banco de preguntas
  for (const p of leerHoja(wb, "Banco_Preguntas")) {
    const cid = cursoId(p.idcurso, "Banco_Preguntas");
    const pregunta = texto(p.pregunta);
    const respuesta = texto(p.respuestacorrecta);
    if (!cid || !pregunta || !respuesta) continue;
    const codigo = texto(p.idpregunta) ?? `PQ-${sufijo()}`;
    const data = { cursoId: cid, nivel: Math.max(1, Math.round(numero(p.nivel, 1))), pregunta, respuestaCorrecta: respuesta, puntos: numero(p.puntos, 1) || 1 };
    await prisma.pregunta.upsert({ where: { codigo }, create: { codigo, ...data }, update: data });
    sumar("preguntas");
  }

  // Asistencia a cursos → sesiones de clase
  for (const a of leerHoja(wb, "Control_Asistencias_Cursos")) {
    const fid = fielId(a.idfiel, "Control_Asistencias_Cursos");
    const cid = cursoId(a.idcurso, "Control_Asistencias_Cursos");
    const f = fecha(a.fecha);
    if (!fid || !cid || !f) continue;
    const dia = new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate()));
    const nivel = Math.max(1, Math.round(numero(a.nivel, 1)));
    const sesion = await prisma.sesionClase.upsert({
      where: { cursoId_nivel_fecha: { cursoId: cid, nivel, fecha: dia } },
      create: { cursoId: cid, nivel, fecha: dia },
      update: {},
    });
    await prisma.asistenciaCurso.upsert({
      where: { sesionId_fielId: { sesionId: sesion.id, fielId: fid } },
      create: { sesionId: sesion.id, fielId: fid },
      update: {},
    });
    sumar("asistencias a clases");
  }

  // Certificados
  for (const c of leerHoja(wb, "Certificados_Emitidos")) {
    const fid = fielId(c.idfiel, "Certificados_Emitidos");
    const cid = cursoId(c.idcurso, "Certificados_Emitidos");
    if (!fid || !cid) continue;
    const creado = fecha(c.fecha) ?? new Date();
    const link = esUrl(c.linkdiplomapdf) ? String(c.linkdiplomapdf).trim() : null;
    const firmado = (v: unknown) => (texto(v) ? creado : null);
    const data = {
      matriculaId: matriculaDe.get(`${fid}|${cid}`) ?? null,
      firmaMaestroAt: firmado(c.firmamaestro),
      firmaSupervisorAt: firmado(c.firmalider ?? c.firmasupervisor),
      firmaPastorAt: firmado(c.firmapastor),
      linkExterno: link,
      estado: link ? ("EMITIDO" as const) : ("EN_FIRMA" as const),
      emitidoAt: link ? creado : null,
    };
    await prisma.certificado.upsert({
      where: { fielId_cursoId: { fielId: fid, cursoId: cid } },
      create: { codigo: texto(c.idcertificado) ?? `CERT-${sufijo()}`, fielId: fid, cursoId: cid, createdAt: creado, ...data },
      update: data,
    });
    sumar("certificados");
  }

  // Bautismos
  for (const b of leerHoja(wb, "Bautismos")) {
    const fid = fielId(b.idfiel, "Bautismos");
    const f = fecha(b.fechabautismo);
    if (!fid || !f) continue;
    const existe = await prisma.bautismo.findFirst({ where: { fielId: fid, fecha: f } });
    if (!existe) {
      await prisma.bautismo.create({
        data: {
          fielId: fid,
          fecha: f,
          ministro: texto(b.ministropastor),
          lugar: texto(b.lugarsede),
          tipo: norm(b.tipoaguaespiritu).startsWith("espiritu") ? "ESPIRITU" : "AGUA",
        },
      });
      await prisma.fiel.update({ where: { id: fid }, data: { bautizado: true } });
    }
    sumar("bautismos");
  }

  // Asistencia congregacional
  for (const a of leerHoja(wb, "Asistencias")) {
    const f = fecha(a.fecha);
    if (!f) continue;
    const codigo = texto(a.idfiel);
    const fid = codigo && norm(codigo) !== "invitado" ? fielId(codigo, "Asistencias") : null;
    if (codigo && norm(codigo) !== "invitado" && !fid) continue;
    const servicio = mapa(SERVICIO, a.servicio) ?? "OTRO";
    const existe = await prisma.asistenciaCongregacional.findFirst({ where: { fecha: f, fielId: fid, servicio } });
    if (!existe) {
      await prisma.asistenciaCongregacional.create({ data: { fecha: f, fielId: fid, nombreInvitado: fid ? null : "Invitado", servicio } });
    }
    sumar("asistencias iglesia");
  }

  // Áreas y eventos (solo filas con datos útiles)
  for (const a of leerHoja(wb, "Areas_Inscritas")) {
    const nombre = texto(a.nombrearea);
    const fid = nombre ? fielId(a.idfiel, "Areas_Inscritas") : null;
    if (!nombre || !fid) continue;
    const area = await prisma.area.upsert({ where: { nombre }, create: { nombre }, update: {} });
    await prisma.miembroArea.upsert({
      where: { fielId_areaId: { fielId: fid, areaId: area.id } },
      create: { fielId: fid, areaId: area.id, cargo: texto(a.cargo) },
      update: { cargo: texto(a.cargo) },
    });
    sumar("miembros de áreas");
  }
  for (const e of leerHoja(wb, "Eventos_Especiales")) {
    const nombre = texto(e.nombreevento);
    const fid = nombre ? fielId(e.idfiel, "Eventos_Especiales") : null;
    if (!nombre || !fid) continue;
    const existe = await prisma.eventoEspecial.findFirst({ where: { fielId: fid, nombre } });
    if (!existe) {
      await prisma.eventoEspecial.create({
        data: { fielId: fid, nombre, tipo: texto(e.tipoevento), fechaInicio: fecha(e.fechainicio), lugar: texto(e.sedelugar), estado: texto(e.estado) },
      });
    }
    sumar("eventos especiales");
  }

  console.log("Importación terminada:");
  for (const [k, v] of Object.entries(conteo)) console.log(`  ✓ ${k}: ${v}`);
  if (avisos.length) {
    console.log(`\nAvisos (${avisos.length}):`);
    [...new Set(avisos)].forEach((a) => console.log(`  • ${a}`));
  }
  console.log('\nNota: los usuarios con rol "Lider" del sistema anterior quedaron como SUPERVISOR (hacían la supervisión académica). Ajústalo en Usuarios y roles si alguno es líder pastoral.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
