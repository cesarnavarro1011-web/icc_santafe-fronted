import { whatsappConfigurado } from "@/lib/server/whatsapp"
import { LoginCliente } from "./login-cliente"

export default function LoginPage() {
  return <LoginCliente whatsapp={whatsappConfigurado()} />
}
