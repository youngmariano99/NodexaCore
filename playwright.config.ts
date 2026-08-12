import { defineConfig, devices } from "@playwright/test";

const PUERTO = 3100;
const BASE_URL = `http://localhost:${PUERTO}`;

export default defineConfig({
  testDir: "./e2e",
  // e2e/flujos-criticos/ tiene su propio config dedicado
  // (playwright.flujos-criticos.config.ts, script `npm run
  // test:e2e:flujos-criticos`): necesita Supabase local + Upstash real, así
  // que corre por fuera de este `testDir`. Sin este `testIgnore`, Playwright
  // recoge esos specs igual (el `testDir` es recursivo) y `npm run test:e2e`
  // — el que corre el job `e2e-tests`, parte de los checks requeridos —
  // intenta ejecutarlos contra las credenciales placeholder de CI y falla
  // en cascada (hallazgo real reportado tras el merge de esta rama).
  testIgnore: ["flujos-criticos/**"],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // "github" solo anota inline en el Summary del job; sin "html" no se genera
  // playwright-report/ y el paso de upload-artifact del workflow no encuentra nada.
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
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
  },
});
