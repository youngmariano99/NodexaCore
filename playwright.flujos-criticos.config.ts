import { defineConfig, devices } from "@playwright/test";

const PUERTO = 3101;
const BASE_URL = `http://localhost:${PUERTO}`;

const SUPABASE_URL_LOCAL = "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY_LOCAL =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SUPABASE_SERVICE_ROLE_KEY_LOCAL =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

/**
 * Config dedicada a `e2e/flujos-criticos/` (onboarding, alta de producto,
 * cobro en mostrador — CLAUDE.md §4 "10% E2E"): deliberadamente separada de
 * `playwright.config.ts`, que sigue apuntando a `e2e/vidriera-publica.spec.ts`
 * con las credenciales placeholder de CI (esa suite prueba explícitamente la
 * degradación controlada SIN backend real, docs/ci.yml). Estos 3 specs
 * necesitan un backend real (login, alta de producto contra `limite_sku`
 * real, descuento de stock real) — corren contra Supabase LOCAL (`npx
 * supabase start`), nunca contra el proyecto cloud, para que sean
 * reproducibles y seguros de correr en CI sin tocar datos reales.
 *
 * `UPSTASH_REDIS_REST_URL`/`TOKEN` NO se pisan acá a propósito:
 * `verificarAuthLimiter` (docs/ERRORS.md NX-SYS-005) hace una llamada de red
 * real en cada login, así que necesita credenciales reales — se toman de
 * `.env.local` en desarrollo local, o de los secrets del job de CI
 * (`.github/workflows/ci.yml`, job `e2e-flujos-criticos`). Sin ellas, el
 * login de estos specs falla con un error sin manejar (mismo hallazgo ya
 * documentado en `tests/integracion/`, no es un bug nuevo de esta estación).
 */
export default defineConfig({
  testDir: "./e2e/flujos-criticos",
  fullyParallel: false,
  // Un único worker: los 3 specs comparten el mismo tenant de fixture
  // (Tenant A) y mutan estado real vía `service_role` (limite_sku, stock de
  // productos) entre `beforeAll`/`afterAll`. Correrlos en paralelo (el
  // default de Playwright) generó timeouts intermitentes reales durante la
  // verificación de esta estación: un spec bajando `limite_sku` mientras
  // otro insertaba productos de fixture para el mismo tenant.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never", outputFolder: "playwright-report-flujos-criticos" }]]
    : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PUERTO}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL_LOCAL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY_LOCAL,
      SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY_LOCAL,
      // Ninguno de estos 3 flujos usa Cloudinary/OpenAI, pero
      // obtenerEntornoServidor() valida el esquema server-only completo en
      // cada crearClienteSupabaseServidor() — mismos placeholders inertes
      // que ya usa .github/workflows/ci.yml para el resto de E2E.
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? "ci-placeholder-cloud-name",
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ?? "ci-placeholder-api-key",
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ?? "ci-placeholder-api-secret",
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "ci-placeholder-openai-key",
    },
  },
});
