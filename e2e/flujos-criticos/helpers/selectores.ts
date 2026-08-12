import type { Locator, Page } from "@playwright/test";

/**
 * `MensajeError` (src/components/errores/MensajeError.tsx) usa `role="alert"`
 * — igual que el `route-announcer` invisible que Next.js inyecta en cada
 * página para lectores de pantalla (`#__next-route-announcer__`, sin
 * texto). `page.getByRole("alert")` a secas resuelve ambos elementos
 * (hallazgo real durante la verificación de esta estación). Filtrar por
 * texto no vacío aísla el mensaje real.
 */
export function mensajeError(page: Page): Locator {
  return page.getByRole("alert").filter({ hasText: /\S/ });
}
