import { verificarOtp } from "@/server/otp";
import { leerBody, responder } from "../_handler";

export async function POST(req: Request) {
  const { identifier, code } = await leerBody(req);
  return responder(async () => {
    await verificarOtp(identifier, code, false);
  });
}
