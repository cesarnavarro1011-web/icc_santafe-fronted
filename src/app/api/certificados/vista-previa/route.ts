import { NextResponse } from "next/server";
import { R, tieneRol } from "@/lib/roles";
import { getSessionUser } from "@/lib/server/session";
import { vistaPreviaCertificado } from "@/server/certificados";

// Certificado de ejemplo con la plantilla actual (página "Plantilla de certificado")
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  if (!tieneRol(user.rol, R.ADMIN)) return NextResponse.json({ message: "Sin permiso" }, { status: 403 });

  const pdf = await vistaPreviaCertificado();
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="Certificado_ejemplo.pdf"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
