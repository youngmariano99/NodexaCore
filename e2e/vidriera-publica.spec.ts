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
  // Mismo criterio que la vidriera: sin conexión real a Supabase en CI, ni el
  // cliente ni el producto son resolubles, así que la ficha debe degradar a
  // NX-WEB-004 con 404 en vez de un error sin manejar. El armado real del
  // enlace wa.me (con el nombre del producto pre-cargado) y la visibilidad
  // del CTA quedan cubiertos por src/repositories/productosRepository.test.ts
  // y por la verificación manual en navegador contra el proyecto Supabase real.
  test("un producto no resoluble muestra la página 404 con NX-WEB-004, no un error sin manejar", async ({ page }) => {
    const respuesta = await page.goto("/c/demo-nodexa/producto/prod-1");

    expect(respuesta?.status()).toBe(404);
    await expect(page.getByText("Esta vidriera no está disponible en este momento.")).toBeVisible();
  });
});
