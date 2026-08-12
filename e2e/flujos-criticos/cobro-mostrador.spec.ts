import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { obtenerMensajeError } from "@/lib/errores/catalogo";

import { crearClienteServicioLocal, TENANT_A } from "./helpers/datosLocal";
import { loginComo } from "./helpers/login";
import { mensajeError } from "./helpers/selectores";

interface FilaProductoFixture {
  producto_id: string;
  sku: string;
  nombre: string;
  stock_actual: number;
}

async function crearProductoFixture(servicio: SupabaseClient, stockInicial: number): Promise<FilaProductoFixture> {
  const sufijo = randomUUID().slice(0, 8);

  const { data, error } = await servicio
    .from("productos")
    .insert({
      cliente_id: TENANT_A.clienteId,
      sku: `E2E-COBRO-${sufijo}`,
      nombre: `Producto E2E Cobro ${sufijo}`,
      precio: 500,
      categoria: "Test",
      stock_actual: stockInicial,
      publicado: false,
    })
    .select("producto_id, sku, nombre, stock_actual")
    .single<FilaProductoFixture>();

  if (error || !data) throw new Error(`No se pudo crear el producto de fixture: ${error?.message}`);
  return data;
}

/**
 * Limpieza completa del producto de fixture, respetando el orden de FKs
 * (hallazgo real durante la verificación de esta estación: borrar
 * `productos` directamente después de una venta exitosa fallaba en
 * silencio — `venta_items.producto_id` referencia `productos` sin
 * `ON DELETE CASCADE` — dejando productos huérfanos como residuo real en
 * la base local). Las ventas generadas por el test de "venta exitosa"
 * también se limpian: son ventas de fixture, no datos del seed real.
 */
async function borrarProductoFixture(servicio: SupabaseClient, productoId: string): Promise<void> {
  const { data: items } = await servicio.from("venta_items").select("venta_id").eq("producto_id", productoId);
  const ventaIds = [...new Set((items ?? []).map((item) => item.venta_id))];

  await servicio.from("venta_items").delete().eq("producto_id", productoId);
  if (ventaIds.length > 0) {
    await servicio.from("ventas").delete().in("venta_id", ventaIds);
  }
  await servicio.from("movimientos_stock").delete().eq("producto_id", productoId);
  await servicio.from("productos").delete().eq("producto_id", productoId);
}

/**
 * Cobro en Mostrador (Paso 1-2, Criterio de Aceptación 3: "simula la
 * selección de productos, confirmación de venta y verificación del
 * descuento de stock resultante"). Los dos casos comparten una única
 * sesión autenticada (mismo criterio que `alta-producto.spec.ts`: un solo
 * login real por archivo, no uno por test, para no agotar el presupuesto
 * real del rate limiter de autenticación — docs/ERRORS.md NX-SYS-005).
 *
 * Cada test crea su propio producto de fixture con `stock_actual` conocido
 * (en vez de reutilizar un producto del seed volumétrico) para poder
 * afirmar el descuento exacto sin depender de cuántas otras ventas ya
 * tocaron ese SKU.
 */
test.describe.serial("Cobro en Mostrador", () => {
  let page: Page;
  let servicio: SupabaseClient;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    servicio = crearClienteServicioLocal();
    await loginComo(page, TENANT_A.email);
    await expect(page).toHaveURL("/dashboard");
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe("venta exitosa descuenta stock real", () => {
    let producto: FilaProductoFixture;

    test.beforeAll(async () => {
      producto = await crearProductoFixture(servicio, 10);
    });

    test.afterAll(async () => {
      await borrarProductoFixture(servicio, producto.producto_id);
    });

    test("buscar, agregar al carrito, confirmar cobro y verificar el descuento de stock", async () => {
      await page.goto("/mostrador");

      await page.getByLabel("Buscar producto por SKU o nombre").fill(producto.sku);

      const filaResultado = page.getByRole("listitem").filter({ hasText: producto.nombre });
      await expect(filaResultado).toBeVisible();

      await filaResultado.getByRole("button", { name: `Agregar ${producto.nombre} a la venta` }).click();

      await expect(page.getByText("El carrito está vacío.")).toHaveCount(0);

      await page.getByRole("button", { name: "Confirmar cobro" }).click();

      await expect(page.getByText("Venta confirmada.")).toBeVisible();

      // El carrito se vacía automáticamente tras una venta exitosa (Criterio
      // de Aceptación de la estación de confirmarVenta, Sprint 6).
      await expect(page.getByText("El carrito está vacío.")).toBeVisible();

      const { data: productoActualizado } = await servicio
        .from("productos")
        .select("stock_actual")
        .eq("producto_id", producto.producto_id)
        .single();
      expect(productoActualizado?.stock_actual).toBe(producto.stock_actual - 1);

      const { data: movimiento } = await servicio
        .from("movimientos_stock")
        .select("tipo, cantidad, saldo_resultante")
        .eq("producto_id", producto.producto_id)
        .order("creado_en", { ascending: false })
        .limit(1)
        .single();
      expect(movimiento).toEqual({ tipo: "salida", cantidad: 1, saldo_resultante: producto.stock_actual - 1 });
    });
  });

  test.describe("stock insuficiente en el momento de confirmar", () => {
    let producto: FilaProductoFixture;

    test.beforeAll(async () => {
      producto = await crearProductoFixture(servicio, 5);
    });

    test.afterAll(async () => {
      await borrarProductoFixture(servicio, producto.producto_id);
    });

    test("un cambio de stock entre la búsqueda y la confirmación se rechaza con NX-VTA-001, sin registrar la venta", async () => {
      await page.goto("/mostrador");

      await page.getByLabel("Buscar producto por SKU o nombre").fill(producto.sku);
      const filaResultado = page.getByRole("listitem").filter({ hasText: producto.nombre });
      await expect(filaResultado).toBeVisible();
      await filaResultado.getByRole("button", { name: `Agregar ${producto.nombre} a la venta` }).click();

      // Simula que otra venta agotó el stock justo después de la búsqueda del
      // cliente: el carrito sigue mostrando stockDisponible=5 (dato ya
      // desactualizado), pero fn_registrar_movimiento_stock valida el stock
      // REAL en el momento del UPDATE atómico, no el que trajo la búsqueda.
      await servicio.from("productos").update({ stock_actual: 0 }).eq("producto_id", producto.producto_id);

      await page.getByRole("button", { name: "Confirmar cobro" }).click();

      await expect(mensajeError(page)).toContainText(obtenerMensajeError("NX-VTA-001"));

      const { count: ventasGeneradas } = await servicio
        .from("venta_items")
        .select("venta_item_id", { count: "exact", head: true })
        .eq("producto_id", producto.producto_id);
      expect(ventasGeneradas).toBe(0);

      const { data: productoTrasFallo } = await servicio
        .from("productos")
        .select("stock_actual")
        .eq("producto_id", producto.producto_id)
        .single();
      expect(productoTrasFallo?.stock_actual).toBe(0);
    });
  });
});
