/**
 * `src/lib/env.ts` valida `entornoCliente` (NEXT_PUBLIC_SUPABASE_URL/
 * ANON_KEY) de forma EAGER al importarse (Fail-Fast) — antes de que
 * cualquier código de esta suite decida si va a llamar o no a Supabase.
 * `crearProducto.ts`/`confirmarVenta.ts` importan transitivamente ese
 * módulo al tope del archivo, así que sin estas variables ya seteadas ANTES
 * de que Vitest cargue el archivo de test, ni siquiera el `import` de esas
 * Server Actions funciona — independientemente de que el código bajo
 * prueba nunca llegue a ejecutar una llamada real (los casos de esta suite
 * cortan en Zod antes). `setupFiles` corre antes de que Vitest resuelva los
 * imports del archivo de test (docs Vitest), por eso alcanza con setear
 * `process.env` acá.
 */
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??=
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
