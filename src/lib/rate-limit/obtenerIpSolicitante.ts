import "server-only";

import { headers } from "next/headers";

/**
 * El proxy de despliegue (Vercel Edge) completa `x-forwarded-for` con la IP
 * real del cliente. En local (sin proxy) no viene: se usa un valor fijo para
 * no romper el rate limiting en desarrollo — todas las requests locales
 * comparten esa clave, comportamiento esperado sin un proxy real delante.
 */
export async function obtenerIpSolicitante(): Promise<string> {
  const listaHeaders = await headers();
  const forwardedFor = listaHeaders.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "ip-desconocida";
}
