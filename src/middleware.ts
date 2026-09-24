import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { rolesParaRuta } from "@/lib/roles";

const CAMBIAR_PASSWORD = "/workspace/cambiar-password";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Contraseña temporal (columna "Temp" del sistema anterior): obligar a cambiarla
    if (token?.debeCambiarPassword && pathname !== CAMBIAR_PASSWORD) {
      return NextResponse.redirect(new URL(CAMBIAR_PASSWORD, req.url));
    }

    const roles = rolesParaRuta(pathname);
    if (roles && (!token?.rol || !roles.includes(token.rol))) {
      return NextResponse.redirect(new URL("/workspace?denegado=1", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: { authorized: ({ token }) => !!token },
    pages: { signIn: "/login" },
  },
);

export const config = { matcher: ["/workspace/:path*"] };
