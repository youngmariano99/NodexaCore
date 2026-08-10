import { describe, expect, it, vi } from "vitest";

import { PRODUCTOS_POR_PAGINA, contarProductosActivos, insertarProducto, obtenerProductosPaginados } from "./productosRepository";

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

function crearBuilderListado(resultado: { data: unknown; error: unknown; count?: number | null }) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    returns: vi.fn(async () => resultado),
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

describe("obtenerProductosPaginados", () => {
  it("usa .range() según la página y el límite pedidos, nunca trae todo sin límite", async () => {
    const builder = crearBuilderListado({ data: [], error: null, count: 0 });
    const supabase = { from: vi.fn(() => builder) };

    await obtenerProductosPaginados(supabase as never, CLIENTE_ID, 2, 25);

    expect(builder.range).toHaveBeenCalledWith(25, 49);
  });

  it("ordena con producto_id como desempate para no repetir/saltear filas cuando varias comparten creado_en", async () => {
    const builder = crearBuilderListado({ data: [], error: null, count: 0 });
    const supabase = { from: vi.fn(() => builder) };

    await obtenerProductosPaginados(supabase as never, CLIENTE_ID, 1, PRODUCTOS_POR_PAGINA);

    expect(builder.order).toHaveBeenNthCalledWith(1, "creado_en", { ascending: false });
    expect(builder.order).toHaveBeenNthCalledWith(2, "producto_id", { ascending: true });
  });

  it("retorna exactamente el rango 26-50 al pedir la página 2 con límite 25 sobre un tenant con 50 productos", async () => {
    const productosPagina2 = Array.from({ length: 25 }, (_, indice) => ({
      producto_id: `p-${indice + 26}`,
      sku: `SKU-${indice + 26}`,
      nombre: `Producto ${indice + 26}`,
      categoria: "Almacén",
      precio: 1000,
      stock_actual: 10,
      publicado: true,
    }));
    const builder = crearBuilderListado({ data: productosPagina2, error: null, count: 50 });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await obtenerProductosPaginados(supabase as never, CLIENTE_ID, 2, 25);

    expect(resultado).toEqual({
      ok: true,
      data: { productos: productosPagina2, total: 50, pagina: 2, porPagina: 25 },
    });
    expect(resultado.ok && resultado.data.productos[0]?.producto_id).toBe("p-26");
    expect(resultado.ok && resultado.data.productos.at(-1)?.producto_id).toBe("p-50");
  });

  it("filtra siempre por eliminado_en IS NULL, excluyendo productos dados de baja", async () => {
    const builder = crearBuilderListado({ data: [], error: null, count: 0 });
    const supabase = { from: vi.fn(() => builder) };

    await obtenerProductosPaginados(supabase as never, CLIENTE_ID, 1, PRODUCTOS_POR_PAGINA);

    expect(builder.is).toHaveBeenCalledWith("eliminado_en", null);
    expect(builder.eq).toHaveBeenCalledWith("cliente_id", CLIENTE_ID);
  });

  it("normaliza página y límite inválidos a los valores por defecto", async () => {
    const builder = crearBuilderListado({ data: [], error: null, count: 0 });
    const supabase = { from: vi.fn(() => builder) };

    await obtenerProductosPaginados(supabase as never, CLIENTE_ID, -3, 0);

    expect(builder.range).toHaveBeenCalledWith(0, PRODUCTOS_POR_PAGINA - 1);
  });

  it("retorna NX-SYS-001 si Supabase devuelve error", async () => {
    const builder = crearBuilderListado({ data: null, error: { message: "fallo" }, count: null });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await obtenerProductosPaginados(supabase as never, CLIENTE_ID, 1, PRODUCTOS_POR_PAGINA);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-001" });
  });
});
