import path from "node:path";

import { defineConfig } from "vitest/config";

/**
 * Config dedicada a la suite de integración (Paso 4: "validar el 20% de la
 * pirámide de testing", CLAUDE.md §4 "70% Unitarias / 20% Integración / 10%
 * E2E"). Deliberadamente separada de `vitest.config.ts`: esa config solo
 * incluye `src/**\/*.test.ts` (unitarias, mockeadas, sin red), así que
 * `npm run test` nunca recoge estos archivos por accidente — mezclar ambas
 * suites en un mismo comando rompería la separación de capas de la
 * pirámide y haría que `npm run test` (pensado para correr rápido, sin
 * dependencias externas) empiece a requerir Docker/Supabase local.
 *
 * `testTimeout` más alto que el default: cada prueba hace llamadas HTTP
 * reales a Postgres/PostgREST/GoTrue local, no mocks en memoria.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Ver tests/integracion/stubs/server-only.ts: reproduce el no-op que
      // Next.js ya aplica en su propio runtime de servidor real.
      "server-only": path.resolve(__dirname, "./tests/integracion/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integracion/**/*.test.ts"],
    setupFiles: ["./tests/integracion/setup-env.ts"],
    passWithNoTests: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
