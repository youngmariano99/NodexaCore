import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Credenciales del entorno local de `supabase start` (supabase/config.toml):
 * son los valores DEMO fijos y públicos que Supabase CLI genera siempre para
 * cualquier proyecto local con el `jwt_secret` por defecto del CLI — no son
 * un secreto real, nunca apuntan al proyecto cloud (pkfxdbfrvbradmzangek).
 * Sobreescribibles por variable de entorno para CI (docs/CLAUDE.md §4
 * "seguridad: prohibido hardcodear credenciales" — acá no aplica: son
 * credenciales públicas de un stack Docker efímero, mismo criterio que usa
 * la propia documentación oficial de Supabase para desarrollo local).
 */
export const SUPABASE_URL_LOCAL = process.env.SUPABASE_URL_LOCAL ?? "http://127.0.0.1:54321";
const ANON_KEY_LOCAL =
  process.env.SUPABASE_ANON_KEY_LOCAL ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY_LOCAL =
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const PASSWORD_DEMO = "NodexaDemo123!";

/**
 * Dos tenants reales del seed volumétrico (docs/SEED.md §1-2), usados en
 * toda la suite para las pruebas de aislamiento cruzado (Paso 2). Se eligen
 * los dos comerciantes (no admin_nodexa) porque son los roles cuyo acceso
 * está efectivamente acotado por RLS de tenant — admin_nodexa tiene lectura
 * global de soporte por diseño (docs/ROLES.md §3.3), así que no sirve para
 * demostrar el aislamiento cruzado.
 */
export const TENANT_A = {
  clienteId: "a1111111-1111-4111-8111-111111111111",
  email: "pedro@almacendonpedro.com",
};

export const TENANT_B = {
  clienteId: "b2222222-2222-4222-8222-222222222222",
  email: "marta@ferreteriaeltornillo.com",
};

/**
 * Falla rápido y con un mensaje accionable si `supabase start` no está
 * corriendo (Criterio de Aceptación 1), en vez de dejar que cada prueba
 * reviente con un `ECONNREFUSED` críptico. Se llama una sola vez desde
 * `beforeAll` en cada archivo de esta suite.
 */
export async function verificarSupabaseLocalDisponible(): Promise<void> {
  try {
    const respuesta = await fetch(`${SUPABASE_URL_LOCAL}/auth/v1/health`, {
      headers: { apikey: ANON_KEY_LOCAL },
    });

    if (!respuesta.ok) {
      throw new Error(`Respuesta no OK: ${respuesta.status}`);
    }
  } catch (error) {
    throw new Error(
      `No se pudo conectar a Supabase local en ${SUPABASE_URL_LOCAL}. ` +
        "Esta suite de integración requiere una instancia local corriendo: ejecutá `npx supabase start` " +
        "(Docker debe estar iniciado) antes de correr `npm run test:integracion`. " +
        `Causa original: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Inicia sesión real contra Supabase Auth local con un usuario demo
 * (docs/SEED.md, password `NodexaDemo123!` para todos). Retorna un cliente
 * `SupabaseClient` autenticado con la `anon key` — mismo cliente que usa
 * `crearClienteSupabaseServidor()` en producción (RLS activa), a diferencia
 * del cliente `service_role` que se reserva acá solo para setup/cleanup de
 * las pruebas.
 */
export async function iniciarSesionComo(email: string): Promise<SupabaseClient> {
  const supabase = createClient(SUPABASE_URL_LOCAL, ANON_KEY_LOCAL);

  const { error } = await supabase.auth.signInWithPassword({ email, password: PASSWORD_DEMO });

  if (error) {
    throw new Error(`No se pudo iniciar sesión como ${email} contra Supabase local: ${error.message}`);
  }

  return supabase;
}

/** Cliente anónimo (sin sesión), para probar accesos sin JWT. */
export function crearClienteAnonimo(): SupabaseClient {
  return createClient(SUPABASE_URL_LOCAL, ANON_KEY_LOCAL);
}

/**
 * Cliente `service_role` (bypassea RLS por completo), reservado
 * exclusivamente para preparar datos de fixture y limpiar después de cada
 * prueba — nunca para ejercitar el comportamiento bajo prueba (docs/ROLES.md
 * §3.9, mismo criterio que el código de producción).
 */
export function crearClienteServicioLocal(): SupabaseClient {
  return createClient(SUPABASE_URL_LOCAL, SERVICE_ROLE_KEY_LOCAL, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
