import { describe, expect, it } from "vitest";

import type { FilaVentaExport, FilaVentaItemExport } from "@/repositories/ventas";

import { serializarVentasCsv } from "./serializarVentasCsv";

function crearVenta(overrides: Partial<FilaVentaExport> = {}): FilaVentaExport {
  return {
    venta_id: "v-1",
    cliente_final_id: null,
    total: 1000,
    estado: "confirmada",
    creado_en: "2026-08-01T10:00:00.000Z",
    ...overrides,
  };
}

function crearVentaItem(overrides: Partial<FilaVentaItemExport> = {}): FilaVentaItemExport {
  return {
    venta_item_id: "vi-1",
    venta_id: "v-1",
    producto_id: "p-1",
    cantidad: 2,
    precio_unitario: 500,
    subtotal: 1000,
    ...overrides,
  };
}

describe("serializarVentasCsv", () => {
  it("incluye ambas secciones con sus encabezados propios", () => {
    const csv = serializarVentasCsv([], []);

    expect(csv).toContain("# ventas");
    expect(csv).toContain("venta_id,cliente_final_id,total,estado,creado_en");
    expect(csv).toContain("# venta_items");
    expect(csv).toContain("venta_item_id,venta_id,producto_id,cantidad,precio_unitario,subtotal");
  });

  it("serializa una fila de ventas con los campos en el orden esperado", () => {
    const csv = serializarVentasCsv([crearVenta()], []);

    expect(csv).toContain("v-1,,1000,confirmada,2026-08-01T10:00:00.000Z");
  });

  it("representa cliente_final_id null como campo vacío (venta de contado)", () => {
    const csv = serializarVentasCsv([crearVenta({ cliente_final_id: null })], []);

    expect(csv).toContain("v-1,,1000,confirmada");
  });

  it("incluye el cliente_final_id cuando la venta es a cuenta corriente", () => {
    const csv = serializarVentasCsv([crearVenta({ cliente_final_id: "cf-1" })], []);

    expect(csv).toContain("v-1,cf-1,1000,confirmada");
  });

  it("serializa una fila de venta_items con los campos en el orden esperado", () => {
    const csv = serializarVentasCsv([], [crearVentaItem()]);

    expect(csv).toContain("vi-1,v-1,p-1,2,500,1000");
  });

  it("las secciones son independientes: ventas vacía no afecta venta_items", () => {
    const csv = serializarVentasCsv([], [crearVentaItem()]);

    expect(csv).toContain("vi-1,v-1,p-1,2,500,1000");
    expect(csv.split("# venta_items")[0]).toContain("venta_id,cliente_final_id,total,estado,creado_en");
  });
});
