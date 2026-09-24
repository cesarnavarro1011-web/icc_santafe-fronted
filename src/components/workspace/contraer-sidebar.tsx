"use client";

import { useEffect } from "react";
import { useSidebar } from "@/components/ui/sidebar";

/**
 * Contrae la barra lateral principal (queda solo con íconos) mientras este
 * componente está montado, y la deja como estaba al salir. Se usa en el espacio
 * de trabajo del curso para dar ancho a su propio menú de actividades.
 */
export function ContraerSidebar() {
  const { open, setOpen, isMobile } = useSidebar();

  useEffect(() => {
    if (isMobile) return;
    const estabaAbierta = open;
    if (estabaAbierta) setOpen(false);
    return () => {
      if (estabaAbierta) setOpen(true);
    };
    // Solo al entrar y salir del curso; si el usuario la abre a mano, se respeta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  return null;
}
