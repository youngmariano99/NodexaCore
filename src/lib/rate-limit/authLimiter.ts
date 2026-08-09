import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { obtenerEntornoServidor } from "@/lib/env";

let instancia: Ratelimit | null = null;

/**
 * Ventana deslizante de 5 intentos cada 15 minutos (docs/ERRORS.md
 * NX-SYS-005). Instancia perezosa y memoizada por proceso: evita reconstruir
 * el cliente Redis en cada invocación sin forzar la validación de env al
 * importar el módulo (mismo criterio que crearClienteSupabaseServidor).
 */
function obtenerAuthLimiter(): Ratelimit {
  if (!instancia) {
    const entorno = obtenerEntornoServidor();

    instancia = new Ratelimit({
      redis: new Redis({
        url: entorno.UPSTASH_REDIS_REST_URL,
        token: entorno.UPSTASH_REDIS_REST_TOKEN,
      }),
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      prefix: "nodexa:auth-limiter",
      analytics: true,
    });
  }

  return instancia;
}

export interface ResultadoAuthLimiter {
  permitido: boolean;
  restantes: number;
  reintentarEnSegundos: number;
}

/**
 * Guard de rate limiting para rutas de autenticación (login y recuperación
 * de contraseña). Clave compuesta IP+email: un atacante que agota el límite
 * contra un email puntual no bloquea a otros usuarios detrás de la misma IP
 * (ej. oficina/NAT compartida), y viceversa un mismo email probado desde
 * distintas IPs sigue acotado por email. Se llama ANTES de tocar Supabase
 * Auth (docs/ERRORS.md NX-SYS-005: "Aplicar backoff... bloquea las
 * solicitudes excedentes antes de llegar a Supabase Auth").
 */
export async function verificarAuthLimiter(ip: string, email: string): Promise<ResultadoAuthLimiter> {
  const limiter = obtenerAuthLimiter();
  const clave = `${ip}:${email.trim().toLowerCase()}`;

  const resultado = await limiter.limit(clave);

  return {
    permitido: resultado.success,
    restantes: resultado.remaining,
    reintentarEnSegundos: Math.max(0, Math.ceil((resultado.reset - Date.now()) / 1000)),
  };
}
