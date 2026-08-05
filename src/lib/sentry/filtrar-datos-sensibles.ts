import type { ErrorEvent } from "@sentry/nextjs";

/**
 * Coincide por inclusión (case-insensitive) contra la clave del campo, no por igualdad exacta,
 * para cubrir variantes como "authorization", "Authorization", "x-authorization", "cliente_id", "clienteId".
 */
const FRAGMENTOS_CLAVE_SENSIBLE = [
  "password",
  "contrasena",
  "contraseña",
  "token",
  "authorization",
  "cookie",
  "secret",
  "service_role",
  "apikey",
  "api_key",
  "cliente_id",
  "clienteid",
] as const;

const PATRON_JWT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const VALOR_REDACTADO = "[REDACTADO]";
const PROFUNDIDAD_MAXIMA = 8;

function normalizar(clave: string): string {
  return clave.toLowerCase().replace(/[-\s]/g, "_");
}

function esClaveSensible(clave: string): boolean {
  const claveNormalizada = normalizar(clave);
  return FRAGMENTOS_CLAVE_SENSIBLE.some((fragmento) => claveNormalizada.includes(fragmento));
}

function pareceToken(valor: unknown): boolean {
  return typeof valor === "string" && PATRON_JWT.test(valor);
}

function limpiarProfundo(valor: unknown, profundidad = 0): unknown {
  if (valor === null || typeof valor !== "object" || profundidad > PROFUNDIDAD_MAXIMA) {
    return pareceToken(valor) ? VALOR_REDACTADO : valor;
  }

  if (Array.isArray(valor)) {
    return valor.map((elemento) => limpiarProfundo(elemento, profundidad + 1));
  }

  const objetoOriginal = valor as Record<string, unknown>;
  const objetoLimpio: Record<string, unknown> = {};

  for (const clave of Object.keys(objetoOriginal)) {
    objetoLimpio[clave] = esClaveSensible(clave)
      ? VALOR_REDACTADO
      : limpiarProfundo(objetoOriginal[clave], profundidad + 1);
  }

  return objetoLimpio;
}

/**
 * beforeSend compartido por sentry.server.config.ts, sentry.edge.config.ts e
 * instrumentation-client.ts: redacta contraseñas, tokens/JWT y cliente_id antes
 * de que el evento salga del proceso hacia Sentry.
 */
export function filtrarDatosSensibles(evento: ErrorEvent): ErrorEvent {
  return {
    ...evento,
    request: evento.request ? (limpiarProfundo(evento.request) as ErrorEvent["request"]) : evento.request,
    extra: evento.extra ? (limpiarProfundo(evento.extra) as ErrorEvent["extra"]) : evento.extra,
    contexts: evento.contexts ? (limpiarProfundo(evento.contexts) as ErrorEvent["contexts"]) : evento.contexts,
    user: evento.user ? (limpiarProfundo(evento.user) as ErrorEvent["user"]) : evento.user,
    tags: evento.tags ? (limpiarProfundo(evento.tags) as ErrorEvent["tags"]) : evento.tags,
  };
}
