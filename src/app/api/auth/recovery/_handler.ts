import { NextResponse } from "next/server";
import { ErrorNegocio } from "@/lib/server/errors";

/** Respuestas con { message } que es lo que lee recovery-form.tsx en caso de error. */
export async function responder(fn: () => Promise<Record<string, unknown> | void>) {
  try {
    return NextResponse.json({ ok: true, ...((await fn()) ?? {}) });
  } catch (e) {
    if (e instanceof ErrorNegocio) return NextResponse.json({ message: e.message }, { status: 400 });
    console.error("[recovery]", e);
    return NextResponse.json({ message: "Error interno. Intenta de nuevo." }, { status: 500 });
  }
}

export async function leerBody(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return {
    identifier: String(body.identifier ?? ""),
    code: String(body.code ?? ""),
    password: String(body.password ?? ""),
  };
}
