import { ipDe } from "@/lib/server/rate-limit";
import { restablecerConOtp } from "@/server/otp";
import { leerBody, responder } from "../_handler";

export async function POST(req: Request) {
  const { identifier, code, password } = await leerBody(req);
  return responder(() => restablecerConOtp(identifier, code, password, ipDe(req.headers)));
}
