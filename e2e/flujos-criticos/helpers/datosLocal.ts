import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Credenciales DEMO fijas y públicas que `supabase start` genera siempre
 * para cualquier proyecto local con el `jwt_secret` por defecto del CLI
 * (mismos valores que `tests/integracion/helpers/entornoSupabaseLocal.ts`,
 * duplicados acá porque Playwright y Vitest son dos test runners
 * independientes con su propio grafo de módulos/config — no vale la pena
 * una dependencia compartida para 3 constantes). Nunca apuntan al proyecto
 * cloud real (pkfxdbfrvbradmzangek).
 */
export const SUPABASE_URL_LOCAL = "http://127.0.0.1:54321";
export const SUPABASE_ANON_KEY_LOCAL =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
export const SUPABASE_SERVICE_ROLE_KEY_LOCAL =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

export const PASSWORD_DEMO = "NodexaDemo123!";

/**
 * Tenant "Almacén Don Pedro" del seed real (docs/SEED.md §1): 50 productos
 * sobre un `limite_sku` de 1000 — con margen de sobra para el alta exitosa,
 * y con el que se simula el 100% bajando `limite_sku` temporalmente vía el
 * cliente de servicio, sin tocar el fixture de ningún otro spec.
 */
export const TENANT_A = {
  clienteId: "a1111111-1111-4111-8111-111111111111",
  email: "pedro@almacendonpedro.com",
  nombreComercio: "Almacén Don Pedro",
};

/** Cliente `service_role` para preparar/restaurar fixtures entre specs — nunca para ejercitar el flujo bajo prueba. */
export function crearClienteServicioLocal(): SupabaseClient {
  return createClient(SUPABASE_URL_LOCAL, SUPABASE_SERVICE_ROLE_KEY_LOCAL, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
