import { whatsappConfigurado } from "@/lib/server/whatsapp"
import { obtenerSitio, urlImagen } from "@/server/contenido"
import { LoginCliente } from "./login-cliente"

export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const s = await obtenerSitio()
  const imagen = s.loginImagenPath ? urlImagen({ imagenPath: s.loginImagenPath, updatedAt: s.updatedAt }) : null
  return <LoginCliente whatsapp={whatsappConfigurado()} imagen={imagen} />
}
