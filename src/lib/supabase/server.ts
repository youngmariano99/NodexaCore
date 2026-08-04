import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { obtenerEntornoServidor } from "@/lib/env";

/**
 * Cliente Supabase para Server Components, Server Actions y Route Handlers.
 * Propaga la sesión del usuario mediante cookies; respeta RLS con la anon key.
 * El import "server-only" hace que el bundler falle si esto se importa desde un Client Component.
 */
export async function crearClienteSupabaseServidor() {
  const entorno = obtenerEntornoServidor();
  const cookieStore = await cookies();

  return createServerClient(entorno.NEXT_PUBLIC_SUPABASE_URL, entorno.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesParaEstablecer) {
        try {
          cookiesParaEstablecer.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Se ignora: setAll fue llamado desde un Server Component sin permiso de escritura.
          // El middleware de sesión (a implementar en la estación de Auth) refresca las cookies.
        }
      },
    },
  });
}

/**
 * Cliente administrativo con service_role: omite RLS por completo.
 * Uso exclusivo en server (cron jobs, webhooks, tareas de sistema). Jamás exponer al cliente.
 */
export function crearClienteSupabaseAdmin() {
  const entorno = obtenerEntornoServidor();

  return createClient(entorno.NEXT_PUBLIC_SUPABASE_URL, entorno.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
