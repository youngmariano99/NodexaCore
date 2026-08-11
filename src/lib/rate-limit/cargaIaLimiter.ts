import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { obtenerEntornoServidor } from "@/lib/env";

let instancia: Ratelimit | null = null;

/**
 * Ventana deslizante de 5 subidas de foto cada 1 minuto por comercio
 * (docs/ERRORS.md NX-SYS-005). Es una capa distinta de `cuota_mensual_ia`
 * (docs/SCHEMA.md §2, controlada vía `fn_registrar_consumo_ia`): esto
 * protege contra ráfagas de requests en un instante puntual (abuso/loop de
 * cliente, no necesariamente un uso legítimo del feature), mientras que la
 * cuota mensual es el límite de negocio del plan contratado. Instancia
 * perezosa y memoizada por proceso, mismo criterio que authLimiter.ts.
 */
function obtenerCargaIaLimiter(): Ratelimit {
  if (!instancia) {
    const entorno = obtenerEntornoServidor();

    instancia = new Ratelimit({
      redis: new Redis({
        url: entorno.UPSTASH_REDIS_REST_URL,
        token: entorno.UPSTASH_REDIS_REST_TOKEN,
      }),
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      prefix: "nodexa:carga-ia-limiter",
      analytics: true,
    });
  }

  return instancia;
}

export interface ResultadoCargaIaLimiter {
  permitido: boolean;
  reintentarEnSegundos: number;
}

/**
 * Guard de rate limiting para `POST /api/carga-ia` (docs/BACKLOG.md "Route
 * Handler de procesamiento de imagen con OpenAI Vision", Paso 1). Clave por
 * `cliente_id`: acota el costo de OpenAI Vision por tenant sin penalizar a
 * otros comercios detrás de la misma IP/NAT. Se llama ANTES de tocar
 * Cloudinary u OpenAI (mismo criterio que verificarAuthLimiter con Supabase
 * Auth).
 */
export async function verificarCargaIaLimiter(clienteId: string): Promise<ResultadoCargaIaLimiter> {
  const limiter = obtenerCargaIaLimiter();

  const resultado = await limiter.limit(clienteId);

  return {
    permitido: resultado.success,
    reintentarEnSegundos: Math.max(0, Math.ceil((resultado.reset - Date.now()) / 1000)),
  };
}
