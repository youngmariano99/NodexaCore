import { z } from "zod";

const esquemaEntornoCliente = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string({ message: "NEXT_PUBLIC_SUPABASE_URL es obligatoria." })
    .url("NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida del proyecto Supabase."),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string({ message: "NEXT_PUBLIC_SUPABASE_ANON_KEY es obligatoria." })
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY no puede estar vacía."),
});

const esquemaEntornoServidor = esquemaEntornoCliente.extend({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string({ message: "SUPABASE_SERVICE_ROLE_KEY es obligatoria." })
    .min(1, "SUPABASE_SERVICE_ROLE_KEY no puede estar vacía."),
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
});

/**
 * Validación server-only bajo demanda. Nunca se invoca desde el bundle de cliente:
 * quien la llama (src/lib/supabase/server.ts) ya está protegido con "server-only".
 */
export function obtenerEntornoServidor(): EntornoServidor {
  return validarEntorno(esquemaEntornoServidor, {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
