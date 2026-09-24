"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { BookOpen, CalendarCheck, ChevronRight, GraduationCap, Hand, LayoutGrid, Layers, Trophy } from "lucide-react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import type { CursoMenu } from "@/server/dashboards"

/** Grupo "Mis cursos" de la barra lateral: cada curso inscrito con sus secciones. */
export function NavCursos({ cursos }: { cursos: CursoMenu[] }) {
  const pathname = usePathname()
  const params = useSearchParams()
  const item = params.get("item") ?? "bienvenida"

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Mis cursos</SidebarGroupLabel>
      <SidebarMenu>
        {cursos.map((c) => {
          const base = `/workspace/mis-cursos/${c.id}`
          const enCurso = pathname === base
          // Si está abierta una actividad, se resalta su nivel
          const nivelActivo = item.startsWith("nivel-")
            ? Number(item.slice(6))
            : c.actividades.find((a) => a.id === item)?.nivel
          const sub = [
            { key: "bienvenida", label: "Bienvenida", icon: Hand, activo: enCurso && item === "bienvenida" },
            ...c.niveles.map((n) => ({ key: `nivel-${n}`, label: `Nivel ${n}`, icon: Layers, activo: enCurso && nivelActivo === n })),
            { key: "asistencia", label: "Mi asistencia", icon: CalendarCheck, activo: enCurso && item === "asistencia" },
            { key: "final", label: "Resultado final", icon: Trophy, activo: enCurso && item === "final" },
          ]
          return (
            <Collapsible key={c.id} asChild defaultOpen={enCurso} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={c.nombre} isActive={enCurso}>
                    {c.aprobado ? <GraduationCap className="text-emerald-600" /> : <BookOpen />}
                    <span className="truncate">{c.nombre}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <SidebarMenuBadge className="right-7 text-[10px]">{c.progreso}%</SidebarMenuBadge>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {sub.map((s) => (
                      <SidebarMenuSubItem key={s.key}>
                        <SidebarMenuSubButton asChild isActive={s.activo}>
                          <Link href={`${base}?item=${s.key}`}>
                            <s.icon />
                            <span>{s.label}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={pathname === "/workspace/mis-cursos"} tooltip="Ver todos mis cursos">
            <Link href="/workspace/mis-cursos">
              <LayoutGrid />
              <span>{cursos.length ? "Ver todos" : "Aún no tienes cursos"}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
