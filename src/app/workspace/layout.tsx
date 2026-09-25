import type { Metadata } from "next";
import { AvisoHost } from "@/components/workspace/aviso";
import { AppSidebar } from "@/components/app-sidebar";
import { Providers } from "@/components/workspace/providers";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { EncabezadoInicio } from "@/components/workspace/encabezado";
import { navParaRol, R, ROL_LABEL, tieneRol } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { cursosParaMenu } from "@/server/dashboards";

export const metadata: Metadata = {
  title: "Espacio de estudio · ICC Santa Fe",
};

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePage();
  const rolLabel = ROL_LABEL[user.rol];
  const bloqueado = user.debeCambiarPassword;
  const cursos = bloqueado ? [] : await cursosParaMenu(user.fielId);

  return (
    <Providers>
      <SidebarProvider>
        <AppSidebar
          nav={bloqueado ? [] : navParaRol(user.rol)}
          cursos={cursos}
          cursosPrimero={!bloqueado && tieneRol(user.rol, R.APRENDIZ)}
          user={{ name: user.name, email: user.email, codigo: user.codigo, rolLabel }}
        />
        <SidebarInset className="bg-slate-50">
          <header className="bg-background sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <EncabezadoInicio puedeVolver={!bloqueado} />
            <span className="text-muted-foreground ml-auto hidden text-xs md:block">
              {user.name} · {rolLabel}
            </span>
          </header>
          <main className="flex flex-1 flex-col gap-5 p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      <AvisoHost />
    </Providers>
  );
}
