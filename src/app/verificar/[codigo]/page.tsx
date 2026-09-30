import { BadgeCheck, CircleX, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { normalizarCodigoRegistro, revisarFormato } from "@/server/codigo-certificado";
import { plantillaResuelta } from "@/server/certificados";
import { Verificador } from "../verificador";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verificar certificado", robots: { index: false } };

function Resultado({ tipo, titulo, children }: { tipo: "ok" | "anulado" | "error"; titulo: string; children: React.ReactNode }) {
  const estilo = {
    ok: { icono: BadgeCheck, color: "text-emerald-600 bg-emerald-50", borde: "border-t-emerald-500" },
    anulado: { icono: TriangleAlert, color: "text-amber-600 bg-amber-50", borde: "border-t-amber-500" },
    error: { icono: CircleX, color: "text-red-600 bg-red-50", borde: "border-t-red-500" },
  }[tipo];
  return (
    <div className={`rounded-2xl border border-t-4 bg-white p-6 shadow-lg ${estilo.borde}`}>
      <div className="flex items-center gap-3">
        <span className={`flex size-12 shrink-0 items-center justify-center rounded-full ${estilo.color}`}>
          <estilo.icono className="size-6" />
        </span>
        <h2 className="text-xl font-bold text-slate-900">{titulo}</h2>
      </div>
      <div className="mt-4 text-slate-600">{children}</div>
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="border-b py-2.5 last:border-0 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{valor}</dd>
    </div>
  );
}

export default async function VerificarCodigoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const codigo = normalizarCodigoRegistro(decodeURIComponent((await params).codigo));
  const formato = revisarFormato(codigo);

  // Siempre se busca en la base; el verificador solo sirve para explicar un código no encontrado
  const c = await prisma.certificado.findUnique({
    where: { codigo },
    select: { codigo: true, estado: true, emitidoAt: true, fiel: { select: { nombre: true, apellido: true } }, curso: { select: { nombre: true } } },
  });
  const institucion = c ? (await plantillaResuelta()).institucion : "";

  let resultado: React.ReactNode;
  if (!c || c.estado === "EN_FIRMA") {
    resultado = (
      <Resultado tipo="error" titulo="Certificado no encontrado">
        <p>
          No existe un certificado emitido con el código <span className="font-mono font-semibold text-slate-900">{codigo}</span>.
        </p>
        <p className="mt-2 text-sm">
          {formato === "mal-escrito"
            ? "Los caracteres de verificación no corresponden: revisa que el código esté bien escrito (sin confundir letras y números)."
            : "Revisa que esté bien escrito. Si el problema continúa, comunícate con la iglesia."}
        </p>
      </Resultado>
    );
  } else {
    const fechaEmision = c.emitidoAt
      ? c.emitidoAt.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota" })
      : "—";
    const anulado = c.estado === "ANULADO";
    resultado = (
      <Resultado tipo={anulado ? "anulado" : "ok"} titulo={anulado ? "Certificado anulado" : "Certificado válido"}>
        <p className="mb-3">
          {anulado
            ? "Este certificado fue emitido pero luego anulado por la institución. No tiene validez."
            : `Este certificado es auténtico y fue emitido por ${institucion}.`}
        </p>
        <dl>
          <Dato label="Otorgado a" valor={`${c.fiel.nombre} ${c.fiel.apellido}`} />
          <Dato label="Curso o programa" valor={c.curso.nombre} />
          <Dato label="Fecha de emisión" valor={fechaEmision} />
          <Dato label="Código de registro" valor={c.codigo} />
        </dl>
      </Resultado>
    );
  }

  return <Verificador codigo={codigo}>{resultado}</Verificador>;
}
