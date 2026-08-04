import postgres from "postgres";

/**
 * Script de verificación de conexión (Paso 5 del ticket).
 * El anon/service_role key viajan por REST (PostgREST) y no permiten correr SQL crudo:
 * para un SELECT 1 real se usa la cadena de conexión directa a Postgres (SUPABASE_DB_URL),
 * disponible en Project Settings > Database > Connection string > URI.
 */
async function verificarConexionSupabase(): Promise<void> {
  const urlConexion = process.env.SUPABASE_DB_URL;

  if (!urlConexion) {
    console.error(
      "[NX-SYS-001] Falta SUPABASE_DB_URL en .env.local. No pudimos completar la acción por un error interno.",
    );
    process.exitCode = 1;
    return;
  }

  const sql = postgres(urlConexion, { max: 1 });

  try {
    const filas = await sql<{ ok: number }[]>`SELECT 1 AS ok`;

    if (filas[0]?.ok === 1) {
      console.log("Conexión con Supabase verificada correctamente (SELECT 1 = 1).");
    } else {
      throw new Error("La consulta de prueba no devolvió el resultado esperado.");
    }
  } catch (error) {
    console.error("[NX-SYS-001] No pudimos completar la conexión de prueba con Supabase.", error);
    process.exitCode = 1;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

void verificarConexionSupabase();
