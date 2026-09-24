// ============================================================
//  Roles, permisos y navegación del espacio de estudio.
//  Sin dependencias de servidor: lo usa también el middleware (edge).
// ============================================================

export const ROLES = [
  "SUPERADMIN",
  "PASTOR",
  "SUPERVISOR",
  "LIDER",
  "MAESTRO",
  "ESTUDIANTE",
] as const;

export type RolUsuario = (typeof ROLES)[number];

export const ROL_LABEL: Record<RolUsuario, string> = {
  SUPERADMIN: "Superadmin",
  PASTOR: "Pastor",
  SUPERVISOR: "Supervisor",
  LIDER: "Líder",
  MAESTRO: "Maestro",
  ESTUDIANTE: "Estudiante",
};

/** Grupos de roles reutilizables para permisos. */
export const R = {
  ADMIN: ["SUPERADMIN", "PASTOR"],
  PASTORAL: ["SUPERADMIN", "PASTOR", "LIDER"],
  ACADEMICO: ["SUPERADMIN", "PASTOR", "SUPERVISOR", "MAESTRO"],
  SUPERVISION: ["SUPERADMIN", "PASTOR", "SUPERVISOR"],
  DOCENTE: ["SUPERADMIN", "PASTOR", "MAESTRO"],
  TODOS: ROLES,
} as const satisfies Record<string, readonly RolUsuario[]>;

export type NavItem = {
  href: string;
  label: string;
  icon: string; // nombre del ícono de lucide-react (ver components/workspace/nav-icons)
  roles: readonly RolUsuario[];
};

export type NavSection = { title: string; items: NavItem[] };

export const NAV: NavSection[] = [
  {
    title: "General",
    items: [
      { href: "/workspace", label: "Inicio", icon: "home", roles: R.TODOS },
      { href: "/workspace/fieles", label: "Fieles", icon: "users", roles: R.PASTORAL },
      { href: "/workspace/asistencia", label: "Asistencia iglesia", icon: "calendar-check", roles: R.PASTORAL },
      { href: "/workspace/bautismos", label: "Bautismos", icon: "droplets", roles: R.PASTORAL },
      { href: "/workspace/inscripciones", label: "Inscripciones y pagos", icon: "credit-card", roles: R.ADMIN },
    ],
  },
  {
    title: "Académico",
    items: [
      { href: "/workspace/cursos", label: "Catálogo de cursos", icon: "book", roles: R.ADMIN },
      { href: "/workspace/asignaciones", label: "Maestros y supervisores", icon: "user-cog", roles: R.ADMIN },
      { href: "/workspace/examenes", label: "Banco de preguntas", icon: "circle-help", roles: R.DOCENTE },
      { href: "/workspace/clases", label: "Mis clases", icon: "presentation", roles: R.ACADEMICO },
      { href: "/workspace/asistencia-cursos", label: "Asistencia de cursos", icon: "clipboard-list", roles: R.ACADEMICO },
      { href: "/workspace/tareas", label: "Revisar tareas", icon: "inbox", roles: R.DOCENTE },
      { href: "/workspace/calificar-examenes", label: "Calificar exámenes", icon: "check-check", roles: R.DOCENTE },
      { href: "/workspace/control-calidad", label: "Control de calidad", icon: "shield-check", roles: R.SUPERVISION },
      { href: "/workspace/certificados", label: "Certificados", icon: "award", roles: R.ACADEMICO },
    ],
  },
  {
    title: "Personal",
    items: [
      // "Mis cursos" no va aquí: la barra lateral lista cada curso del usuario (ver AppSidebar)
      { href: "/workspace/mis-certificados", label: "Mis certificados", icon: "award", roles: R.TODOS },
    ],
  },
  {
    title: "Administración",
    items: [
      { href: "/workspace/usuarios", label: "Usuarios y roles", icon: "key-round", roles: R.ADMIN },
    ],
  },
];

export function navParaRol(rol: RolUsuario): NavSection[] {
  return NAV.map((s) => ({ ...s, items: s.items.filter((i) => i.roles.includes(rol)) })).filter(
    (s) => s.items.length > 0,
  );
}

/** Rutas del workspace y los roles que pueden entrar (el prefijo más largo gana). */
export function rolesParaRuta(pathname: string): readonly RolUsuario[] | null {
  let match: NavItem | null = null;
  for (const s of NAV) {
    for (const i of s.items) {
      if (i.href === "/workspace") continue;
      if (pathname === i.href || pathname.startsWith(i.href + "/")) {
        if (!match || i.href.length > match.href.length) match = i;
      }
    }
  }
  return match?.roles ?? null;
}

export function tieneRol(rol: RolUsuario | undefined, permitidos: readonly RolUsuario[]) {
  return !!rol && permitidos.includes(rol);
}
