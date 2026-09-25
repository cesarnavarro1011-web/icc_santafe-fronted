"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { esRutaSinMenu } from "@/lib/roles";

/** Parte izquierda del encabezado: botón del menú o, en páginas a pantalla completa, "Volver". */
export function EncabezadoInicio({ puedeVolver }: { puedeVolver: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  if (esRutaSinMenu(pathname)) {
    if (!puedeVolver) return <span className="text-sm font-semibold">Espacio de estudio</span>;
    return (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() => (window.history.length > 1 ? router.back() : router.push("/workspace"))}
      >
        <ArrowLeft /> Volver al espacio de estudio
      </Button>
    );
  }

  return (
    <>
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      <Link href="/workspace" className="text-muted-foreground text-sm hover:underline">
        Espacio de estudio
      </Link>
    </>
  );
}
