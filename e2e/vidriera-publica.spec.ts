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
  test("muestra el nombre del cliente a partir del slug de la URL", async ({ page }) => {
    await page.goto("/c/demo-nodexa");

    await expect(page.getByRole("heading", { name: "Vidriera de demo-nodexa" })).toBeVisible();
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
