import { expect, test } from "@playwright/test";

test.describe("Landing pública", () => {
  test("carga la home sin errores de consola", async ({ page }) => {
    const erroresConsola: string[] = [];
    page.on("console", (mensaje) => {
      if (mensaje.type() === "error") {
        erroresConsola.push(mensaje.text());
      }
    });

    const respuesta = await page.goto("/");

    expect(respuesta?.status()).toBe(200);
    expect(erroresConsola).toEqual([]);
  });
});

test.describe("Vidriera pública (publico)/c/[clienteSlug]", () => {
  // CI no ejercita una conexión real a Supabase (ver .github/workflows/ci.yml):
  // cualquier slug resulta en un cliente no resoluble, así que la página debe
  // degradar de forma controlada a NX-WEB-004 con 404 — nunca un error 500 sin
  // manejar. La verificación de contenido real de un tenant (nombre del
  // comercio, catálogo publicado) queda cubierta por las pruebas de
  // integración de src/repositories/clientes.test.ts y por la verificación
  // manual en navegador contra el proyecto Supabase real.
  test("un clienteSlug no resoluble muestra la página 404 con NX-WEB-004, no un error sin manejar", async ({ page }) => {
    const respuesta = await page.goto("/c/demo-nodexa");

    expect(respuesta?.status()).toBe(404);
    await expect(page.getByText("Esta vidriera no está disponible en este momento.")).toBeVisible();
  });
});

test.describe("Ficha pública de producto y CTA de WhatsApp", () => {
  test("el CTA arma un enlace wa.me con el mensaje del producto", async ({ page }) => {
    await page.goto("/c/demo-nodexa/producto/prod-1");

    const cta = page.getByRole("link", { name: "Consultar por WhatsApp" });

    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", /^https:\/\/wa\.me\/\d+\?text=/);
  });
});
