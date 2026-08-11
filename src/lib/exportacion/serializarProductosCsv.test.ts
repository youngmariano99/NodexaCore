import { describe, expect, it } from "vitest";

import type { FilaProductoListado } from "@/repositories/productosRepository";

import { serializarProductosCsv } from "./serializarProductosCsv";

function crearProducto(overrides: Partial<FilaProductoListado> = {}): FilaProductoListado {
  return {
    producto_id: "p-1",
    sku: "SKU-001",
    nombre: "Producto de prueba",
    categoria: "Herramientas",
    precio: 1500.5,
    stock_actual: 10,
    publicado: true,
    ...overrides,
  };
}

describe("serializarProductosCsv", () => {
  it("arma el encabezado exacto en la primera línea", () => {
    const csv = serializarProductosCsv([]);

    expect(csv).toBe("sku,nombre,categoria,precio,stock_actual,publicado");
  });

  it("serializa una fila con todos los campos en el orden esperado", () => {
    const csv = serializarProductosCsv([crearProducto()]);
    const fila = csv.split("\r\n").at(1) ?? "";

    expect(fila).toBe("SKU-001,Producto de prueba,Herramientas,1500.5,10,true");
  });

  it("separa filas con CRLF (RFC 4180)", () => {
    const csv = serializarProductosCsv([crearProducto({ sku: "A" }), crearProducto({ sku: "B" })]);

    expect(csv.split("\r\n")).toHaveLength(3);
  });

  it("envuelve entre comillas un nombre que contiene una coma", () => {
    const csv = serializarProductosCsv([crearProducto({ nombre: "Tornillo, 1/2 pulgada" })]);
    const fila = csv.split("\r\n").at(1) ?? "";

    expect(fila).toContain('"Tornillo, 1/2 pulgada"');
  });

  it("duplica las comillas internas de un campo que ya contiene comillas", () => {
    const csv = serializarProductosCsv([crearProducto({ nombre: 'Producto "Premium"' })]);
    const fila = csv.split("\r\n").at(1) ?? "";

    expect(fila).toContain('"Producto ""Premium"""');
  });

  it("representa categoria null como campo vacío", () => {
    const csv = serializarProductosCsv([crearProducto({ categoria: null })]);
    const fila = csv.split("\r\n").at(1) ?? "";

    expect(fila).toBe("SKU-001,Producto de prueba,,1500.5,10,true");
  });

  it("representa publicado=false como 'false' literal", () => {
    const csv = serializarProductosCsv([crearProducto({ publicado: false })]);
    const fila = csv.split("\r\n").at(1) ?? "";

    expect(fila.endsWith(",false")).toBe(true);
  });
});
