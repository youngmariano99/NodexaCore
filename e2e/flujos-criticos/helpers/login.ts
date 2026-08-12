import type { Page } from "@playwright/test";

import { PASSWORD_DEMO } from "./datosLocal";

/**
 * Login real vía UI (Paso 2: "simular el recorrido completo de un
 * comerciante desde el login"). Nunca inyecta cookies/tokens directamente:
 * completa el formulario real y espera la redirección real de
 * `iniciarSesion.ts`, ejercitando el mismo camino que un usuario real
 * (incluyendo `verificarAuthLimiter`, docs/ERRORS.md NX-SYS-005).
 */
export async function loginComo(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD_DEMO);
  await page.getByRole("button", { name: "Ingresar" }).click();
}
