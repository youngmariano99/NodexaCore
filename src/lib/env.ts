import { z } from "zod";

/**
 * .env.local con `CLAVE=` (sin valor) llega a process.env como "", no como
 * undefined. Sin este preprocesador, z.string().optional() sigue rechazando
 * esa cadena vacía contra .min(1)/.url() y tumba toda la app al importar
 * entornoCliente — justamente el caso que una var "desactivada" debe tolerar.
 */
function opcional<T extends z.ZodTypeAny>(esquema: T) {
  return z.preprocess((valor) => (valor === "" ? undefined : valor), esquema.optional());
}

const esquemaEntornoCliente = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string({ message: "NEXT_PUBLIC_SUPABASE_URL es obligatoria." })
    .url("NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida del proyecto Supabase."),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string({ message: "NEXT_PUBLIC_SUPABASE_ANON_KEY es obligatoria." })
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY no puede estar vacía."),
  NEXT_PUBLIC_SENTRY_DSN: opcional(
    z.string().url("NEXT_PUBLIC_SENTRY_DSN debe ser una URL de DSN válida de Sentry."),
  ),
  /**
   * Nave Nodriza (telemetría de negocio externa, agencia AppyStudio).
   * Opcionales a propósito: sin ellos, src/lib/analytics/nave-nodriza.ts
   * queda en no-op silencioso (criterio de "no debe fallar si está desactivado").
   */
  NEXT_PUBLIC_NN_CLIENT_ID: opcional(z.string().min(1)),
  NEXT_PUBLIC_NN_API_KEY: opcional(z.string().min(1)),
  NEXT_PUBLIC_NN_ENDPOINT: opcional(z.string().url("NEXT_PUBLIC_NN_ENDPOINT debe ser una URL válida.")),
});

const esquemaEntornoServidor = esquemaEntornoCliente.extend({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string({ message: "SUPABASE_SERVICE_ROLE_KEY es obligatoria." })
    .min(1, "SUPABASE_SERVICE_ROLE_KEY no puede estar vacía."),
  /**
   * Upstash Redis (rate limiting de rutas de autenticación —
   * src/lib/rate-limit/authLimiter.ts). Obligatorias: a diferencia de Sentry
   * o Nave Nodriza, esto es un control de seguridad activo, no telemetría
   * opcional degradable a no-op.
   */
  UPSTASH_REDIS_REST_URL: z
    .string({ message: "UPSTASH_REDIS_REST_URL es obligatoria." })
    .url("UPSTASH_REDIS_REST_URL debe ser una URL válida del REST endpoint de Upstash."),
  UPSTASH_REDIS_REST_TOKEN: z
    .string({ message: "UPSTASH_REDIS_REST_TOKEN es obligatoria." })
    .min(1, "UPSTASH_REDIS_REST_TOKEN no puede estar vacía."),
  /**
   * Cloudinary (compresión/almacenamiento de imágenes de producto —
   * src/repositories/imagenesRepository.ts). Obligatorias como Upstash: es
   * un servicio activo del pipeline de alta de producto, no telemetría
   * opcional degradable a no-op. `API_SECRET` nunca lleva prefijo
   * NEXT_PUBLIC_ — firma las subidas server-side.
   */
  CLOUDINARY_CLOUD_NAME: z
    .string({ message: "CLOUDINARY_CLOUD_NAME es obligatoria." })
    .min(1, "CLOUDINARY_CLOUD_NAME no puede estar vacía."),
  CLOUDINARY_API_KEY: z
    .string({ message: "CLOUDINARY_API_KEY es obligatoria." })
    .min(1, "CLOUDINARY_API_KEY no puede estar vacía."),
  CLOUDINARY_API_SECRET: z
    .string({ message: "CLOUDINARY_API_SECRET es obligatoria." })
    .min(1, "CLOUDINARY_API_SECRET no puede estar vacía."),
  /**
   * OpenAI (extracción de nombre/precio/categoría desde la foto de etiqueta —
   * src/lib/openai/extraerDatosEtiqueta.ts, Módulo Carga con IA). Obligatoria
   * como Cloudinary/Upstash: es un servicio activo del pipeline, no
   * telemetría opcional degradable a no-op.
   */
  OPENAI_API_KEY: z
    .string({ message: "OPENAI_API_KEY es obligatoria." })
    .min(1, "OPENAI_API_KEY no puede estar vacía."),
});

type EntornoCliente = z.infer<typeof esquemaEntornoCliente>;
type EntornoServidor = z.infer<typeof esquemaEntornoServidor>;

function formatearErroresEntorno(error: z.ZodError): string {
  return error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n");
}

function validarEntorno<T>(esquema: z.ZodType<T>, fuente: Record<string, string | undefined>): T {
  const resultado = esquema.safeParse(fuente);

  if (!resultado.success) {
    throw new Error(
      `Configuración de entorno inválida. Revisá las variables en .env.local (ver .env.example):\n${formatearErroresEntorno(resultado.error)}`,
    );
  }

  return resultado.data;
}

/**
 * Validado de forma eager al importarse: cualquier módulo cliente (browser)
 * que dependa de estas variables falla al arranque si faltan, cumpliendo Fail-Fast.
 * Solo incluye variables NEXT_PUBLIC_* — nunca importar aquí valores server-only.
 */
export const entornoCliente: EntornoCliente = validarEntorno(esquemaEntornoCliente, {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_NN_CLIENT_ID: process.env.NEXT_PUBLIC_NN_CLIENT_ID,
  NEXT_PUBLIC_NN_API_KEY: process.env.NEXT_PUBLIC_NN_API_KEY,
  NEXT_PUBLIC_NN_ENDPOINT: process.env.NEXT_PUBLIC_NN_ENDPOINT,
});

/**
 * Validación server-only bajo demanda. Nunca se invoca desde el bundle de cliente:
 * quien la llama (src/lib/supabase/server.ts) ya está protegido con "server-only".
 */
export function obtenerEntornoServidor(): EntornoServidor {
  return validarEntorno(esquemaEntornoServidor, {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_NN_CLIENT_ID: process.env.NEXT_PUBLIC_NN_CLIENT_ID,
    NEXT_PUBLIC_NN_API_KEY: process.env.NEXT_PUBLIC_NN_API_KEY,
    NEXT_PUBLIC_NN_ENDPOINT: process.env.NEXT_PUBLIC_NN_ENDPOINT,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  });
}
