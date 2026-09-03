import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { obtenerMensajeError } from "@/lib/errores/catalogo";

import { crearClienteServicioLocal, TENANT_A } from "./helpers/datosLocal";
import { loginComo } from "./helpers/login";

/**
 * Alta de producto (Paso 1-2, Criterio de Aceptación 2: "cubre tanto el
 * alta exitosa como el bloqueo al alcanzar el limite_sku"). Los dos casos
 * comparten una única sesión autenticada (`test.describe.serial` + un solo
 * login en `beforeAll`, reutilizado vía un `page` de módulo en vez del
 * fixture `page` de Playwright): cada login real consume presupuesto del
 * rate limiter de autenticación (`verificarAuthLimiter`, docs/ERRORS.md
 * NX-SYS-005, 5 intentos cada 15 minutos por IP+email) — hallazgo real
 * durante la verificación de esta estación, donde loguearse una vez por
 * test agotaba el límite real a mitad de la suite.
 *
 * El caso de bloqueo baja `limite_sku` de Tenant A al conteo real de
 * productos ANTES del test (vía `service_role`, instancia local efímera —
 * no el proyecto cloud) y lo restaura después: ningún tenant del seed está
 * exactamente en su límite por diseño (docs/SEED.md), así que forzar el
 * 100% es la única forma determinística de reproducir `NX-PRD-001` sin
 * depender de datos frágiles.
 */
test.describe.serial("Alta de producto", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginComo(page, TENANT_A.email);
    await expect(page).toHaveURL("/dashboard");
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("caso exitoso: un comerciante con margen bajo su límite carga un producto nuevo con éxito", async () => {
    await page.goto("/productos/nuevo");

    const skuUnico = `E2E-${randomUUID().slice(0, 8)}`;

    await page.getByLabel("SKU").fill(skuUnico);
    await page.getByLabel("Nombre").fill("Producto de prueba E2E");
    
    await page.getByText("Seleccionar categoría...").click();
    await page.getByPlaceholder("Escribí para buscar...").fill("Almacén");
    await page.keyboard.press("Enter");

    await page.getByLabel("Precio base ($)").fill("1500");
    await page.getByRole("button", { name: "Siguiente: Dimensiones" }).click();
    await page.getByRole("button", { name: "Siguiente: Matriz de Stock" }).click();
    await page.getByRole("button", { name: "Siguiente: Resumen" }).click();
    await page.getByRole("button", { name: "Guardar y finalizar" }).click();

    await expect(page.getByText("¡Producto guardado exitosamente!")).toBeVisible();

    const servicio = crearClienteServicioLocal();
    const { data } = await servicio
      .from("productos")
      .select("producto_id")
      .eq("cliente_id", TENANT_A.clienteId)
      .eq("sku", skuUnico)
      .maybeSingle();
    expect(data).not.toBeNull();

    if (data) {
      await servicio.from("productos").delete().eq("producto_id", data.producto_id);
    }
  });

  test.describe("bloqueo al 100% del límite", () => {
    let limiteSkuOriginal: number;

    test.beforeAll(async () => {
      const servicio = crearClienteServicioLocal();

      const { data: cliente, error: errorCliente } = await servicio
        .from("clientes")
        .select("limite_sku")
        .eq("cliente_id", TENANT_A.clienteId)
        .single();
      if (errorCliente || !cliente) throw new Error(`No se pudo leer limite_sku de fixture: ${errorCliente?.message}`);
      limiteSkuOriginal = cliente.limite_sku;

      const { count, error: errorConteo } = await servicio
        .from("productos")
        .select("producto_id", { count: "exact", head: true })
        .eq("cliente_id", TENANT_A.clienteId)
        .is("eliminado_en", null);
      if (errorConteo || count === null) throw new Error(`No se pudo contar productos activos: ${errorConteo?.message}`);

      const { error: errorUpdate } = await servicio
        .from("clientes")
        .update({ limite_sku: count })
        .eq("cliente_id", TENANT_A.clienteId);
      if (errorUpdate) throw new Error(`No se pudo bajar limite_sku para el fixture de bloqueo: ${errorUpdate.message}`);
    });

    test.afterAll(async () => {
      const servicio = crearClienteServicioLocal();
      await servicio.from("clientes").update({ limite_sku: limiteSkuOriginal }).eq("cliente_id", TENANT_A.clienteId);
    });

    test("al llegar al 100% del límite, el alta se bloquea con el modal y el mensaje de NX-PRD-001", async () => {
      await page.goto("/productos/nuevo");

      await page.getByLabel("SKU").fill(`E2E-BLOQUEO-${randomUUID().slice(0, 8)}`);
      await page.getByLabel("Nombre").fill("Producto que no debería entrar");
      
      await page.getByText("Seleccionar categoría...").click();
      await page.getByPlaceholder("Escribí para buscar...").fill("Almacén");
      await page.keyboard.press("Enter");

      await page.getByLabel("Precio base ($)").fill("100");
      await page.getByRole("button", { name: "Siguiente: Dimensiones" }).click();
      await page.getByRole("button", { name: "Siguiente: Matriz de Stock" }).click();
      await page.getByRole("button", { name: "Siguiente: Resumen" }).click();
      await page.getByRole("button", { name: "Guardar y finalizar" }).click();

      const modal = page.getByRole("dialog", { name: "Llegaste al límite de tu catálogo" });
      await expect(modal).toBeVisible();
      await expect(modal.getByText(obtenerMensajeError("NX-PRD-001"))).toBeVisible();
      await expect(modal.getByRole("link", { name: "Ampliar catálogo" })).toBeVisible();

      // El modal de bloqueo nunca usa el acento rojo de MensajeError
      // (docs/DESIGN.md §4: "nunca en tono punitivo o rojo").
      await expect(page.locator(".border-red-500")).toHaveCount(0);
    });
  });
});
