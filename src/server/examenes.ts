import "server-only";
import { ACADEMICO } from "@/lib/config";

export type DetalleRespuesta = {
  preguntaId: string;
  pregunta: string;
  respuestaCorrecta: string;
  respuesta: string;
  puntos: number;
  correcto: boolean;
};

/** Normaliza para comparar: sin tildes, minúsculas y espacios simples. */
export function normalizarRespuesta(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.,;:!¡?¿"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function calificar(
  preguntas: { id: string; pregunta: string; respuestaCorrecta: string; puntos: number }[],
  respuestas: Record<string, string>,
) {
  let total = 0;
  let obtenidos = 0;
  const detalle: DetalleRespuesta[] = preguntas.map((p) => {
    const respuesta = (respuestas[p.id] ?? "").trim();
    const correcto = normalizarRespuesta(respuesta) === normalizarRespuesta(p.respuestaCorrecta);
    total += p.puntos;
    if (correcto) obtenidos += p.puntos;
    return { preguntaId: p.id, pregunta: p.pregunta, respuestaCorrecta: p.respuestaCorrecta, respuesta, puntos: p.puntos, correcto };
  });
  const nota = total > 0 ? Math.round((obtenidos / total) * ACADEMICO.NOTA_MAX * 10) / 10 : 0;
  return { detalle, total, obtenidos, nota, aprobado: nota >= ACADEMICO.NOTA_MIN_APROBAR };
}
