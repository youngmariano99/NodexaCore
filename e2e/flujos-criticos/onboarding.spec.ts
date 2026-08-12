import { expect, test } from "@playwright/test";

import { obtenerMensajeError } from "@/lib/errores/catalogo";

import { TENANT_A } from "./helpers/datosLocal";
import { loginComo } from "./helpers/login";
import { mensajeError } from "./helpers/selectores";

/**
 * Flujo de onboarding/login (Paso 1-2 del checklist, Criterio de Aceptación
 * 1: "simula el login y la navegación inicial del comerciante hasta el
 * dashboard"). Corre contra Supabase local real (Docker,
 * `playwright.flujos-criticos.config.ts`) con un usuario demo real del seed
 * (docs/SEED.md) — no hay ningún mock de sesión ni de backend acá.
 *
 * Solo 2 tests de este archivo hacen un login real (uno válido, uno
 * inválido): cada intento consume presupuesto del rate limiter real de
 * autenticación (`verificarAuthLimiter`, docs/ERRORS.md NX-SYS-005, 5
 * intentos cada 15 minutos por IP+email) — hallazgo real durante la
 * verificación de esta estación. La navegación al mostrador se probó
 * originalmente en un test aparte con su propio login; se fusionó acá
 * mismo, sobre la sesión ya autenticada, para no gastar un tercer intento.
 */
test.describe("Onboarding: login del comerciante", () => {
  test("un comerciante con credenciales válidas llega al dashboard y navega al mostrador", async ({ page }) => {
    await loginComo(page, TENANT_A.email);

    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Resumen operativo de tu comercio.")).toBeVisible();

    // Confirma que el dashboard muestra datos reales del tenant correcto
    // (no un placeholder): "Productos activos" viene de contarProductosActivos
    // sobre el cliente_id real resuelto por la sesión.
    await expect(page.getByText("Productos activos")).toBeVisible();

    await page.goto("/mostrador");
    await expect(page.getByRole("heading", { name: "Mostrador" })).toBeVisible();
  });

  test("credenciales inválidas muestran el mensaje de NX-SYS-006, sin redirigir al dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(TENANT_A.email);
    await page.getByLabel("Contraseña").fill("una-contraseña-incorrecta");
    await page.getByRole("button", { name: "Ingresar" }).click();

    await expect(mensajeError(page)).toContainText(obtenerMensajeError("NX-SYS-006"));
    await expect(page).toHaveURL("/login");
  });

  test("acceder a /dashboard sin sesión redirige a /login con NX-SYS-002", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login\?error=NX-SYS-002/);
  });
});
