"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { Heart, Sparkles, Target, Users } from "lucide-react";

const ICONOS = [Users, Target, Heart, Sparkles];

type Cifra = { valor: string; etiqueta: string };

/** "1.000+" → { antes: "", numero: 1000, despues: "+", miles: true }; "Más de 50" también funciona. */
function descomponer(valor: string) {
  const m = valor.match(/^(\D*)([\d.,]+)(.*)$/);
  if (!m) return null;
  const miles = /\d[.,]\d{3}(?!\d)/.test(m[2]);
  const numero = Number(m[2].replace(/[.,]/g, ""));
  return Number.isFinite(numero) ? { antes: m[1], numero, despues: m[3], miles } : null;
}

/** Número que cuenta desde 0 hasta su valor la primera vez que entra en pantalla. */
function Contador({ valor, activo }: { valor: string; activo: boolean }) {
  const partes = descomponer(valor);
  const reducir = useReducedMotion();
  const [actual, setActual] = useState(0);

  useEffect(() => {
    if (!activo || !partes) return;
    if (reducir) return setActual(partes.numero);
    const control = animate(0, partes.numero, {
      duration: Math.min(2.2, 0.8 + partes.numero / 800),
      ease: "easeOut",
      onUpdate: (v) => setActual(Math.round(v)),
    });
    return () => control.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, reducir, valor]);

  if (!partes) return <>{valor}</>; // valores no numéricos se muestran tal cual
  const texto = partes.miles ? actual.toLocaleString("es-CO") : String(actual);
  return (
    <>
      {partes.antes}
      <span className="tabular-nums">{texto}</span>
      {partes.despues}
    </>
  );
}

/** Franja de cifras de Nosotros: los números cuentan al hacer scroll. */
export default function CifrasAnimadas({ cifras }: { cifras: Cifra[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const visible = useInView(ref, { once: true, margin: "-80px" });
  const columnas = cifras.length >= 4 ? "md:grid-cols-4" : cifras.length === 3 ? "md:grid-cols-3" : "";

  // Solo los números se animan (cuentan desde 0); íconos y textos quedan fijos
  return (
    <div ref={ref} className={`py-10 grid grid-cols-1 sm:grid-cols-2 gap-6 text-center ${columnas}`}>
      {cifras.map((c, i) => {
        const Icono = ICONOS[i % ICONOS.length];
        return (
          <div key={i}>
            <Icono className="h-9 w-9 mx-auto mb-2 text-blue-200" />
            <div className="text-3xl md:text-4xl font-bold mb-1">
              <Contador valor={c.valor} activo={visible} />
            </div>
            <div className="text-sm md:text-lg font-semibold text-blue-200">{c.etiqueta}</div>
          </div>
        );
      })}
    </div>
  );
}
