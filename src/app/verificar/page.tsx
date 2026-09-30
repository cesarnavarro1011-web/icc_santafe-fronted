import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { normalizarCodigoRegistro } from "@/server/codigo-certificado";
import { Verificador } from "./verificador";

export const metadata: Metadata = { title: "Verificar certificado", robots: { index: false } };

export default async function VerificarPage({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  const { codigo } = await searchParams;
  const limpio = codigo ? normalizarCodigoRegistro(codigo) : "";
  if (limpio) redirect(`/verificar/${encodeURIComponent(limpio)}`);
  return <Verificador />;
}
