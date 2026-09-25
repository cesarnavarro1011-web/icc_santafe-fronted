import { ipDe } from "@/lib/server/rate-limit";
import { solicitarOtp } from "@/server/otp";
import { leerBody, responder } from "../_handler";

export async function POST(req: Request) {
  const { identifier } = await leerBody(req);
  return responder(() => solicitarOtp(identifier, ipDe(req.headers)));
}
