// ============================================================
//  Roles, permisos y navegación del espacio de estudio.
//  Sin dependencias de servidor: lo usa también el middleware (edge).
// ============================================================

export const ROLES = [
  "SUPERADMIN",
  "PASTOR",
  "SUPERVISOR",
  "LIDER",
  "MARCADOR",
  "MAESTRO",
  "ESTUDIANTE",
] as const;

export type RolUsuario = (typeof ROLES)[number];

export const ROL_LABEL: Record<RolUsuario, string> = {
  SUPERADMIN: "Superadmin",
  PASTOR: "Pastor",
  SUPERVISOR: "Supervisor",
  LIDER: "Líder",
  MARCADOR: "Marcador",
  MAESTRO: "Maestro",
  ESTUDIANTE: "Estudiante",
};

/**
 * Grupos de roles reutilizables para permisos.
 * El pastor es auditor: ve todo lo académico y la asistencia, pero no registra
 * asistencia ni califica; administra catálogo, fieles, usuarios, asignaciones y
 * da la firma final de los certificados.
 */
export const R = {
  ADMIN: ["SUPERADMIN", "PASTOR"],
  PASTORAL: ["SUPERADMIN", "PASTOR", "LIDER"],
  ACADEMICO: ["SUPERADMIN", "PASTOR", "SUPERVISOR", "MAESTRO"],
  SUPERVISION: ["SUPERADMIN", "PASTOR", "SUPERVISOR"],
  /** Contenido de cursos (banco de preguntas) y vista de tareas/exámenes */
  DOCENTE: ["SUPERADMIN", "PASTOR", "MAESTRO"],
  /** Calificar tareas y exámenes, aprobar estudiantes */
  CALIFICA: ["SUPERADMIN", "MAESTRO"],
  /** Registrar clases y su asistencia */
  REGISTRA_CLASES: ["SUPERADMIN", "SUPERVISOR", "MAESTRO"],
  /** Firma de supervisor en certificados */
  FIRMA_SUPERVISOR: ["SUPERADMIN", "SUPERVISOR"],
  /** Ver la asistencia de la iglesia (registrar depende del turno semanal) */
  ASISTENCIA_IGLESIA: ["SUPERADMIN", "PASTOR", "LIDER", "MARCADOR"],
  /** Pueden registrar asistencia de la iglesia cuando su grupo tiene turno */
  REGISTRA_POR_TURNO: ["LIDER", "MARCADOR"],
  /** Estudian: su Inicio es el tablero del estudiante */
  APRENDIZ: ["ESTUDIANTE", "MARCADOR"],
  TODOS: ROLES,
} as const satisfies Record<string, readonly RolUsuario[]>;

export type NavItem = {
  href: string;
  label: string;
  icon: string; // nombre del ícono de lucide-react (ver ICONOS en app-sidebar)
  roles: readonly RolUsuario[];
};

export type NavSection = { title: string; items: NavItem[] };

export const NAV: NavSection[] = [
  {
    title: "General",
    items: [
      { href: "/workspace", label: "Inicio", icon: "home", roles: R.TODOS },
      { href: "/workspace/fieles", label: "Fieles", icon: "users", roles: R.PASTORAL },
      { href: "/workspace/asistencia", label: "Asistencia iglesia", icon: "calendar-check", roles: R.ASISTENCIA_IGLESIA },
      { href: "/workspace/bautismos", label: "Bautismos", icon: "droplets", roles: R.PASTORAL },
      { href: "/workspace/inscripciones", label: "Inscripciones y pagos", icon: "credit-card", roles: R.ADMIN },
    ],
  },
  {
    title: "Grupos",
    items: [
      { href: "/workspace/grupos", label: "Grupos y líderes", icon: "users-round", roles: R.ADMIN },
      { href: "/workspace/cronograma", label: "Cronograma de asistencia", icon: "calendar-range", roles: R.ASISTENCIA_IGLESIA },
      { href: "/workspace/mi-grupo", label: "Mi grupo", icon: "users-round", roles: ["LIDER"] },
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
      { href: "/workspace/calificar-examenes", label: "Exámenes", icon: "check-check", roles: R.DOCENTE },
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

/** Páginas que se muestran a pantalla completa, sin la barra lateral principal (como "otra página"). */
export const RUTAS_SIN_MENU = ["/workspace/perfil", "/workspace/cambiar-password"];

export function esRutaSinMenu(pathname: string) {
  return RUTAS_SIN_MENU.some((r) => pathname === r || pathname.startsWith(r + "/"));
}
