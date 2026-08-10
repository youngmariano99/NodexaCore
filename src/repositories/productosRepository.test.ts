import { describe, expect, it, vi } from "vitest";

import { contarProductosActivos, insertarProducto } from "./productosRepository";

interface ResultadoSupabase {
  data: unknown;
  error: unknown;
}

function crearBuilderConteo(resultado: { count: number | null; error: unknown }) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(async () => resultado),
  };
  return builder;
}

function crearBuilderInsert(resultado: ResultadoSupabase) {
  const builder = {
    insert: vi.fn(() => builder),
    select: vi.fn(() => builder),
    single: vi.fn(async () => resultado),
  };
  return builder;
}

const CLIENTE_ID = "a1111111-1111-4111-8111-111111111111";

describe("contarProductosActivos", () => {
  it("cuenta solo productos no eliminados del tenant, sin traer las filas", async () => {
    const builder = crearBuilderConteo({ count: 42, error: null });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await contarProductosActivos(supabase as never, CLIENTE_ID);

    expect(resultado).toEqual({ ok: true, data: 42 });
    expect(builder.eq).toHaveBeenCalledWith("cliente_id", CLIENTE_ID);
    expect(builder.is).toHaveBeenCalledWith("eliminado_en", null);
  });

  it("retorna NX-SYS-001 si Supabase devuelve error", async () => {
    const builder = crearBuilderConteo({ count: null, error: { message: "fallo" } });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await contarProductosActivos(supabase as never, CLIENTE_ID);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-001" });
  });
});

describe("insertarProducto", () => {
  const datos = { clienteId: CLIENTE_ID, sku: "ABC-001", nombre: "Yerba Mate 1kg", precio: 3500, categoria: "Almacén" };

  it("inserta el producto con el cliente_id fijado desde el servidor", async () => {
    const filaCreada = { producto_id: "p-1", cliente_id: CLIENTE_ID, ...datos };
    const builder = crearBuilderInsert({ data: filaCreada, error: null });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await insertarProducto(supabase as never, datos);

    expect(resultado).toEqual({ ok: true, data: filaCreada });
    expect(builder.insert).toHaveBeenCalledWith({
      cliente_id: CLIENTE_ID,
      sku: "ABC-001",
      nombre: "Yerba Mate 1kg",
      precio: 3500,
      categoria: "Almacén",
    });
  });

  it("retorna NX-PRD-002 ante un SKU duplicado (violación de UNIQUE cliente_id+sku)", async () => {
    const builder = crearBuilderInsert({
      data: null,
      error: { code: "23505", message: "duplicate key value violates unique constraint" },
    });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await insertarProducto(supabase as never, datos);

    expect(resultado).toEqual({ ok: false, error: "NX-PRD-002" });
  });

  it("retorna NX-SYS-001 ante cualquier otro error de inserción", async () => {
    const builder = crearBuilderInsert({ data: null, error: { message: "fallo de conexión" } });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await insertarProducto(supabase as never, datos);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-001" });
  });
});
