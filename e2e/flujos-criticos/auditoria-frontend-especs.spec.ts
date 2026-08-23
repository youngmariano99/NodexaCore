import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { obtenerMensajeError } from "@/lib/errores/catalogo";
import { crearClienteServicioLocal, TENANT_A } from "./helpers/datosLocal";
import { loginComo } from "./helpers/login";

test.describe.serial("Auditoría Frontend y Flujos Críticos", () => {
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

  test.describe("Paso 1: Bloqueo de tenant_modules", () => {
    test.beforeAll(async () => {
      // Desactivar módulo de devoluciones temporalmente para pruebas de bloqueo
      await servicio
        .from("tenant_modules")
        .update({ activo: false })
        .eq("cliente_id", TENANT_A.clienteId)
        .eq("modulo", "devoluciones");
    });

    test.afterAll(async () => {
      // Reactivar módulo de devoluciones
      await servicio
        .from("tenant_modules")
        .update({ activo: true })
        .eq("cliente_id", TENANT_A.clienteId)
        .eq("modulo", "devoluciones");
    });

    test("acceder a nueva devolución con módulo inactivo muestra NX-DEV-001", async () => {
      await page.goto("/devoluciones/nueva");
      await expect(page.getByText(obtenerMensajeError("NX-DEV-001"))).toBeVisible();
    });
  });

  test.describe("Paso 2: Edición de producto y registro de stock", () => {
    let productoId: string;
    const sku = `E2E-EDIT-${randomUUID().slice(0, 8)}`;

    test.beforeAll(async () => {
      // Crear producto para editar
      const { data } = await servicio
        .from("productos")
        .insert({
          cliente_id: TENANT_A.clienteId,
          sku,
          nombre: "Producto E2E Editar",
          precio: 100,
          categoria: "Test",
          stock_actual: 10,
        })
        .select("producto_id")
        .single();
      if (!data) throw new Error("No se pudo crear el producto");
      productoId = data.producto_id;
    });

    test.afterAll(async () => {
      await servicio.from("movimientos_stock").delete().eq("producto_id", productoId);
      await servicio.from("productos").delete().eq("producto_id", productoId);
    });

    test("edita correctamente los datos del producto", async () => {
      await page.goto(`/productos/${productoId}`);
      await page.getByLabel("Nombre").fill("Producto E2E Nombre Editado");
      await page.getByLabel("Precio").fill("150");
      await page.getByRole("button", { name: "Guardar cambios" }).click();

      await expect(page).toHaveURL("/productos");

      const { data } = await servicio
        .from("productos")
        .select("nombre, precio")
        .eq("producto_id", productoId)
        .single();
      expect(data?.nombre).toBe("Producto E2E Nombre Editado");
      expect(data?.precio).toBe(150);
    });

    test("registra entrada de stock correctamente desde la vista de stock", async () => {
      await page.goto("/stock");

      // Buscar el producto en la lista y abrir modal de movimiento de stock
      await page.getByPlaceholder("Buscar por nombre o SKU...").fill(sku);
      const fila = page.getByRole("row").filter({ hasText: sku });
      await expect(fila).toBeVisible();

      await fila.getByRole("button", { name: "Registrar movimiento" }).click();

      // Completar modal
      await page.getByLabel("Tipo de movimiento").selectOption("entrada");
      await page.getByLabel("Cantidad").fill("5");
      await page.getByLabel("Motivo").fill("Carga de mercadería E2E");
      await page.getByRole("button", { name: "Registrar" }).click();

      await expect(page.getByText("Movimiento registrado con éxito.")).toBeVisible();

      const { data } = await servicio
        .from("productos")
        .select("stock_actual")
        .eq("producto_id", productoId)
        .single();
      expect(data?.stock_actual).toBe(15); // 10 inicial + 5 entrada
    });
  });

  test.describe("Paso 3: Cobro a cuenta corriente y registro de pagos (Fiados)", () => {
    let clienteFinalId: string;
    let productoId: string;
    const sku = `E2E-FIA-${randomUUID().slice(0, 8)}`;

    test.beforeAll(async () => {
      // Crear cliente final de fiado
      const { data: clienteFinal } = await servicio
        .from("clientes_finales")
        .insert({
          cliente_id: TENANT_A.clienteId,
          nombre: "Cliente Fiado E2E",
          telefono: "+54911223344",
          saldo_deudor: 0,
        })
        .select("cliente_final_id")
        .single();
      if (!clienteFinal) throw new Error("No se pudo crear el cliente final");
      clienteFinalId = clienteFinal.cliente_final_id;

      // Crear producto
      const { data: producto } = await servicio
        .from("productos")
        .insert({
          cliente_id: TENANT_A.clienteId,
          sku,
          nombre: "Producto E2E Fiado",
          precio: 2000,
          categoria: "Test",
          stock_actual: 10,
        })
        .select("producto_id")
        .single();
      if (!producto) throw new Error("No se pudo crear el producto");
      productoId = producto.producto_id;
    });

    test.afterAll(async () => {
      // Borrar ventas asociadas
      const { data: items } = await servicio.from("venta_items").select("venta_id").eq("producto_id", productoId);
      const ventaIds = (items ?? []).map((item) => item.venta_id);
      
      await servicio.from("venta_items").delete().eq("producto_id", productoId);
      if (ventaIds.length > 0) {
        await servicio.from("ventas").delete().in("venta_id", ventaIds);
      }
      await servicio.from("movimientos_cuenta_corriente").delete().eq("cliente_final_id", clienteFinalId);
      await servicio.from("clientes_finales").delete().eq("cliente_final_id", clienteFinalId);
      await servicio.from("movimientos_stock").delete().eq("producto_id", productoId);
      await servicio.from("productos").delete().eq("producto_id", productoId);
    });

    test("realiza venta al fiado incrementando saldo deudor y luego cobra saldo deudor", async () => {
      // 1. Venta al fiado
      await page.goto("/mostrador");

      // Seleccionar cliente
      await page.getByPlaceholder("Buscar cliente para fiar (opcional)...").fill("Cliente Fiado E2E");
      await page.getByRole("button", { name: "Cliente Fiado E2E" }).click();

      // Agregar producto al carrito
      await page.getByLabel("Buscar producto por SKU o nombre").fill(sku);
      const fila = page.getByRole("listitem").filter({ hasText: "Producto E2E Fiado" });
      await expect(fila).toBeVisible();
      await fila.getByRole("button", { name: "Agregar Producto E2E Fiado a la venta" }).click();

      // Confirmar cobro
      await page.getByRole("button", { name: "Confirmar cobro" }).click();
      await expect(page.getByText("Venta confirmada.")).toBeVisible();

      // Verificar que saldo deudor incrementó a 2000
      const { data: clienteFinal } = await servicio
        .from("clientes_finales")
        .select("saldo_deudor")
        .eq("cliente_final_id", clienteFinalId)
        .single();
      expect(clienteFinal?.saldo_deudor).toBe(2000);

      // 2. Registro de pago
      await page.goto(`/clientes/${clienteFinalId}`);
      await page.getByRole("button", { name: "Registrar Pago" }).click();
      await page.getByLabel("Monto a pagar").fill("1500");
      await page.getByRole("button", { name: "Confirmar Pago" }).click();

      await expect(page.getByText("Pago registrado con éxito.")).toBeVisible();

      // Verificar saldo resultante
      const { data: clienteFinalDespues } = await servicio
        .from("clientes_finales")
        .select("saldo_deudor")
        .eq("cliente_final_id", clienteFinalId)
        .single();
      expect(clienteFinalDespues?.saldo_deudor).toBe(500); // 2000 - 1500
    });
  });
});
