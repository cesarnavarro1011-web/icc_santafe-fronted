import { Search, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

/** Marco común de la verificación pública: encabezado, buscador y contenido. */
export function Verificador({ codigo = "", children }: { codigo?: string; children?: ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-[70vh] bg-slate-50">
        <section className="bg-gradient-to-br from-[#1e3a5f] via-indigo-800 to-violet-800 px-4 pt-32 pb-16 text-center text-white">
          <ShieldCheck className="mx-auto mb-3 size-10 text-amber-300" />
          <h1 className="text-3xl font-bold md:text-4xl">Verificar certificado</h1>
          <p className="mx-auto mt-2 max-w-xl text-white/80">
            Escribe el código de registro que aparece en la parte inferior del certificado, o escanea su código QR.
          </p>
          <form action="/verificar" method="get" className="mx-auto mt-6 flex max-w-lg gap-2">
            <input
              name="codigo"
              defaultValue={codigo}
              required
              placeholder="Ej: ICCSF-2026-0001-K7"
              aria-label="Código de registro"
              className="min-w-0 flex-1 rounded-lg border border-white/30 bg-white/95 px-4 py-2.5 font-mono text-slate-900 uppercase placeholder:normal-case placeholder:text-slate-400 focus:ring-2 focus:ring-amber-300 focus:outline-none"
            />
            <button type="submit" className="flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 font-semibold text-slate-900 hover:bg-amber-300">
              <Search className="size-4" /> Verificar
            </button>
          </form>
        </section>
        {children && <div className="mx-auto -mt-8 max-w-2xl px-4 pb-16">{children}</div>}
      </main>
      <Footer />
    </>
  );
}
