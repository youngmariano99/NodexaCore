import { randomUUID } from "node:crypto";

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { crearProducto } from "@/services/productos/crearProducto";
import { ESTADO_CREAR_PRODUCTO_INICIAL } from "@/services/productos/tipos";
import { confirmarVenta } from "@/services/ventas/confirmarVenta";
import { ESTADO_CONFIRMAR_VENTA_INICIAL } from "@/services/ventas/tipos";
import { insertarProducto } from "@/repositories/productosRepository";

import { crearClienteServicioLocal, iniciarSesionComo, TENANT_A, verificarSupabaseLocalDisponible } from "./helpers/entornoSupabaseLocal";

function crearFormData(campos: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [clave, valor] of Object.entries(campos)) {
    formData.set(clave, valor);
  }
  return formData;
}

/**
 * Paso 3 del checklist: confirma que un payload malicioso nunca llega a
 * ejecutarse como SQL. La defensa tiene dos capas distintas, probadas por
 * separado:
 *
 * 1. Zod (`crearProducto`/`confirmarVenta`): rechaza el formato ANTES de
 *    tocar Supabase. Estas pruebas llaman las Server Actions reales
 *    directamente — sin mockear `next/headers` — porque un input con
 *    formato inválido nunca llega a `crearClienteSupabaseServidor()`
 *    (que necesita un scope de request de Next.js): ambas funciones
 *    devuelven el error de Zod antes de esa línea, así que invocarlas acá
 *    con Node puro es seguro y fiel al código real.
 *
 * 2. El Query Builder de `supabase-js` (`insertarProducto`): un string de
 *    intento de inyección SÍ pasa la validación de Zod (`sku`/`nombre` solo
 *    exigen no estar vacíos) y SÍ llega a Postgres — la defensa acá es que
 *    `.insert({ nombre: valor })` siempre viaja como parámetro
 *    (`$1`, vía el protocolo de PostgREST), nunca como texto concatenado en
 *    la sentencia SQL, así que el valor se guarda como dato inerte. Esto se
 *    verifica con una sesión real autenticada contra Supabase local, no con
 *    un mock.
 */
describe("crearProducto: capa Zod rechaza formato antes de tocar Supabase", () => {
  it("un precio con intento de SQL injection no es un número válido: NX-PRD-003 sin llamar a Supabase", async () => {
    const formData = crearFormData({
      sku: "SKU-TEST-001",
      nombre: "Producto de prueba",
      precio: "1; DROP TABLE productos;--",
      categoria: "Test",
    });

    const resultado = await crearProducto(ESTADO_CREAR_PRODUCTO_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-PRD-003", exito: false });
  });

  it("un precio negativo disfrazado de expresión no es aceptado: NX-PRD-003", async () => {
    const formData = crearFormData({
      sku: "SKU-TEST-002",
      nombre: "Producto de prueba",
      precio: "-1 OR 1=1",
      categoria: "Test",
    });

    const resultado = await crearProducto(ESTADO_CREAR_PRODUCTO_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-PRD-003", exito: false });
  });

  it("un SKU vacío se rechaza con NX-SYS-006 antes de tocar la base", async () => {
    const formData = crearFormData({ sku: "", nombre: "Producto", precio: "100", categoria: "Test" });

    const resultado = await crearProducto(ESTADO_CREAR_PRODUCTO_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-006", exito: false });
  });
});

describe("confirmarVenta: capa Zod rechaza formato antes de tocar Supabase", () => {
  it("un producto_id con intento de SQL injection no es un UUID válido: NX-SYS-006", async () => {
    const formData = crearFormData({
      idempotency_key: randomUUID(),
      items: JSON.stringify([{ productoId: "'; DROP TABLE ventas; --", cantidad: 1 }]),
      total: "100",
    });

    const resultado = await confirmarVenta(ESTADO_CONFIRMAR_VENTA_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-006", exito: false, ventaId: null });
  });

  it("una idempotency_key que no es UUID se rechaza con NX-SYS-006", async () => {
    const formData = crearFormData({
      idempotency_key: "no-es-un-uuid; SELECT * FROM usuarios",
      items: JSON.stringify([{ productoId: randomUUID(), cantidad: 1 }]),
      total: "100",
    });

    const resultado = await confirmarVenta(ESTADO_CONFIRMAR_VENTA_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-006", exito: false, ventaId: null });
  });

  it("una cantidad negativa o no numérica se rechaza con NX-SYS-006", async () => {
    const formData = crearFormData({
      idempotency_key: randomUUID(),
      items: JSON.stringify([{ productoId: randomUUID(), cantidad: "-5; DELETE FROM productos" }]),
      total: "100",
    });

    const resultado = await confirmarVenta(ESTADO_CONFIRMAR_VENTA_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-006", exito: false, ventaId: null });
  });

  it("un total negativo se rechaza con NX-VTA-003 sin invocar el RPC", async () => {
    const formData = crearFormData({
      idempotency_key: randomUUID(),
      items: JSON.stringify([{ productoId: randomUUID(), cantidad: 1 }]),
      total: "-100",
    });

    const resultado = await confirmarVenta(ESTADO_CONFIRMAR_VENTA_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-VTA-003", exito: false, ventaId: null });
  });

  it("un JSON malformado en items se rechaza con NX-SYS-006", async () => {
    const formData = crearFormData({
      idempotency_key: randomUUID(),
      items: "{esto no es JSON válido",
      total: "100",
    });

    const resultado = await confirmarVenta(ESTADO_CONFIRMAR_VENTA_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-006", exito: false, ventaId: null });
  });
});

describe("insertarProducto: el Query Builder neutraliza inyección que sí pasa Zod (sesión real contra Supabase local)", () => {
  let clienteA: SupabaseClient;
  const productoIdsCreados: string[] = [];

  beforeAll(async () => {
    await verificarSupabaseLocalDisponible();
    clienteA = await iniciarSesionComo(TENANT_A.email);
  });

  afterEach(async () => {
    if (productoIdsCreados.length === 0) return;
    const servicio = crearClienteServicioLocal();
    await servicio.from("productos").delete().in("producto_id", productoIdsCreados);
    productoIdsCreados.length = 0;
  });

  it("un nombre con sentencia SQL se guarda como texto literal, no se ejecuta", async () => {
    const nombreMalicioso = "Robot'); DROP TABLE productos; --";

    const resultado = await insertarProducto(clienteA, {
      clienteId: TENANT_A.clienteId,
      sku: `RLS-INJ-${randomUUID().slice(0, 8)}`,
      nombre: nombreMalicioso,
      precio: 100,
      categoria: "Test",
    });

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error("esperado ok=true");
    productoIdsCreados.push(resultado.data.producto_id);

    expect(resultado.data.nombre).toBe(nombreMalicioso);

    const servicio = crearClienteServicioLocal();
    const { count, error } = await servicio.from("productos").select("producto_id", { count: "exact", head: true });
    expect(error).toBeNull();
    expect(count).toBeGreaterThan(0);
  });

  it("un SKU con un intento de tautología (' OR '1'='1) se guarda como texto literal", async () => {
    const skuMalicioso = `' OR '1'='1-${randomUUID().slice(0, 8)}`;

    const resultado = await insertarProducto(clienteA, {
      clienteId: TENANT_A.clienteId,
      sku: skuMalicioso,
      nombre: "Producto con SKU malicioso",
      precio: 50,
      categoria: "Test",
    });

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error("esperado ok=true");
    productoIdsCreados.push(resultado.data.producto_id);
    expect(resultado.data.sku).toBe(skuMalicioso);
  });

  it("una categoría con comentario SQL (--) no altera la sentencia ejecutada", async () => {
    const resultado = await insertarProducto(clienteA, {
      clienteId: TENANT_A.clienteId,
      sku: `RLS-INJ2-${randomUUID().slice(0, 8)}`,
      nombre: "Producto de prueba",
      precio: 10,
      categoria: "Herramientas' --",
    });

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error("esperado ok=true");
    productoIdsCreados.push(resultado.data.producto_id);
    expect(resultado.data.categoria).toBe("Herramientas' --");
  });
});
