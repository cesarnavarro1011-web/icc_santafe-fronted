"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Award,
  Book,
  BookOpen,
  CalendarCheck,
  CalendarRange,
  CheckCheck,
  CircleHelp,
  ClipboardList,
  CreditCard,
  Droplets,
  Home,
  Inbox,
  KeyRound,
  Presentation,
  ShieldCheck,
  UserCog,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react"

import { NavUser } from "@/components/nav-user"
import { NavCursos } from "@/components/workspace/nav-cursos"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { esRutaSinMenu, type NavSection } from "@/lib/roles"
import type { CursoMenu } from "@/server/dashboards"

const ICONOS: Record<string, LucideIcon> = {
  home: Home,
  users: Users,
  "calendar-check": CalendarCheck,
  droplets: Droplets,
  "credit-card": CreditCard,
  book: Book,
  "user-cog": UserCog,
  "circle-help": CircleHelp,
  presentation: Presentation,
  "clipboard-list": ClipboardList,
  inbox: Inbox,
  "check-check": CheckCheck,
  "shield-check": ShieldCheck,
  award: Award,
  "book-open": BookOpen,
  "key-round": KeyRound,
  "users-round": UsersRound,
  "calendar-range": CalendarRange,
}

type Props = React.ComponentProps<typeof Sidebar> & {
  nav: NavSection[]
  /** Cursos inscritos del usuario, se listan como grupo "Mis cursos" */
  cursos: CursoMenu[]
  /** Estudiante: los cursos van justo después de "General" */
  cursosPrimero: boolean
  user: { name: string; email: string | null; rolLabel: string; codigo: string }
}

export function AppSidebar({ nav, cursos, cursosPrimero, user, ...props }: Props) {
  const pathname = usePathname()
  const activo = (href: string) => (href === "/workspace" ? pathname === href : pathname.startsWith(href))

  // Perfil y cambio de contraseña se ven como otra página, sin la barra principal
  if (esRutaSinMenu(pathname)) return null

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/workspace">
                <Image src="/images/logo.jpg" alt="ICC Santa Fe" width={32} height={32} className="size-8 rounded-lg object-cover" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">ICC Santa Fe</span>
                  <span className="text-muted-foreground truncate text-xs">Espacio de estudio · {user.rolLabel}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {nav.map((section, i) => (
          <React.Fragment key={section.title}>
            {!cursosPrimero && cursos.length > 0 && section.title === "Personal" && <MisCursos cursos={cursos} />}
            <SidebarGroup>
              <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = ICONOS[item.icon] ?? Home
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={activo(item.href)} tooltip={item.label}>
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>
            {cursosPrimero && i === 0 && <MisCursos cursos={cursos} />}
          </React.Fragment>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function MisCursos({ cursos }: { cursos: CursoMenu[] }) {
  // useSearchParams (resaltar la sección abierta) necesita un límite de Suspense
  return (
    <React.Suspense>
      <NavCursos cursos={cursos} />
    </React.Suspense>
  )
}
