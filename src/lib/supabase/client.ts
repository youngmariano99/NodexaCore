import { createBrowserClient } from "@supabase/ssr";

import { entornoCliente } from "@/lib/env";

/**
 * Cliente Supabase para uso en Client Components (browser).
 * Usa exclusivamente la anon key: nunca importar acá la service role key.
 */
export function crearClienteSupabaseNavegador() {
  return createBrowserClient(
    entornoCliente.NEXT_PUBLIC_SUPABASE_URL,
    entornoCliente.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
