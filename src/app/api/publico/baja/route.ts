import { NextResponse } from "next/server";
import { NOMBRE_IGLESIA } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { esc } from "@/lib/server/mail";
import { tokenBajaValido } from "@/server/comunicados";

// Enlace "No quiero recibir más comunicados" de los correos masivos.
//   GET  /api/publico/baja?f=<fielId>&t=<token>          → página de confirmación
//   POST /api/publico/baja?f=<fielId>&t=<token>          → baja con un clic (List-Unsubscribe-Post de Gmail)
//   GET  /api/publico/baja?f=…&t=…&accion=alta           → volver a suscribirse

function pagina(titulo: string, texto: string, extra = "") {
  return new NextResponse(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)}</title>
     <style>body{font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px}
     .c{background:#fff;border:1px solid #e2e8f0;border-radius:16px;max-width:440px;padding:32px;text-align:center}
     h1{font-size:20px;color:#0f172a;margin:0 0 8px}p{color:#475569;line-height:1.6}
     a,button{display:inline-block;margin-top:12px;background:#4f46e5;color:#fff;border:0;border-radius:999px;padding:10px 20px;font-weight:600;text-decoration:none;cursor:pointer;font-size:14px}</style></head>
     <body><div class="c"><p style="font-size:12px;color:#94a3b8;margin:0 0 12px">${esc(NOMBRE_IGLESIA)}</p><h1>${esc(titulo)}</h1><p>${texto}</p>${extra}</div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

async function validar(req: Request) {
  const url = new URL(req.url);
  const f = url.searchParams.get("f") ?? "";
  const t = url.searchParams.get("t") ?? "";
  if (!f || !t || !tokenBajaValido(f, t)) return null;
  const fiel = await prisma.fiel.findUnique({ where: { id: f }, select: { id: true, nombre: true } });
  return fiel ? { fiel, url } : null;
}

export async function GET(req: Request) {
  const v = await validar(req);
  if (!v) return pagina("Enlace no válido", "Este enlace no es válido o está incompleto.");
  const { fiel, url } = v;

  if (url.searchParams.get("accion") === "alta") {
    await prisma.fiel.update({ where: { id: fiel.id }, data: { recibeInformativos: true } });
    return pagina("¡Listo!", `${esc(fiel.nombre)}, volverás a recibir nuestros comunicados.`);
  }

  await prisma.fiel.update({ where: { id: fiel.id }, data: { recibeInformativos: false } });
  url.searchParams.set("accion", "alta");
  return pagina(
    "Te diste de baja",
    `${esc(fiel.nombre)}, ya no recibirás comunicados informativos. Los avisos de tus cursos, pagos y contraseña seguirán llegándote.`,
    `<a href="${esc(url.pathname + url.search)}">Me equivoqué, quiero seguir recibiéndolos</a>`,
  );
}

export async function POST(req: Request) {
  const v = await validar(req);
  if (!v) return NextResponse.json({ ok: false }, { status: 400 });
  await prisma.fiel.update({ where: { id: v.fiel.id }, data: { recibeInformativos: false } });
  return NextResponse.json({ ok: true });
}
