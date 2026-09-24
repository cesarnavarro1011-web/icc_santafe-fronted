import type { Metadata } from "next";
import { Toaster } from "sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { Providers } from "@/components/workspace/providers";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { navParaRol, ROL_LABEL } from "@/lib/roles";
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
          cursosPrimero={!bloqueado && user.rol === "ESTUDIANTE"}
          user={{ name: user.name, email: user.email, codigo: user.codigo, rolLabel }}
        />
        <SidebarInset className="bg-slate-50">
          <header className="bg-background sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <span className="text-muted-foreground text-sm">Espacio de estudio</span>
            <span className="text-muted-foreground ml-auto hidden text-xs md:block">
              {user.name} · {rolLabel}
            </span>
          </header>
          <main className="flex flex-1 flex-col gap-5 p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      <Toaster richColors position="top-right" />
    </Providers>
  );
}
