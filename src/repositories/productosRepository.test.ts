import { describe, expect, it, vi } from "vitest";

import {
  LIMITE_BUSQUEDA_PRODUCTOS,
  PRODUCTOS_POR_PAGINA,
  buscarProductosParaVenta,
  contarProductosActivos,
  insertarProducto,
  insertarProductosEnLote,
  obtenerProductosPaginados,
} from "./productosRepository";

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

function crearBuilderUpsert(resultado: ResultadoSupabase) {
  const builder = {
    upsert: vi.fn(() => builder),
    select: vi.fn(() => builder),
    returns: vi.fn(async () => resultado),
  };
  return builder;
}

describe("insertarProductosEnLote", () => {
  const productos = [
    { sku: "DP-001", nombre: "Yerba Mate 1kg", precio: 3500, categoria: "Almacén" },
    { sku: "DP-002", nombre: "Fideos 500g", precio: 900, categoria: "Almacén" },
  ];

  it("retorna data vacía sin llamar a Supabase cuando el lote está vacío", async () => {
    const supabase = { from: vi.fn() };

    const resultado = await insertarProductosEnLote(supabase as never, CLIENTE_ID, []);

    expect(resultado).toEqual({ ok: true, data: [] });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("hace upsert con ignoreDuplicates sobre (cliente_id, sku) fijando el cliente_id del servidor", async () => {
    const builder = crearBuilderUpsert({
      data: [
        { producto_id: "p-1", sku: "DP-001" },
        { producto_id: "p-2", sku: "DP-002" },
      ],
      error: null,
    });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await insertarProductosEnLote(supabase as never, CLIENTE_ID, productos);

    expect(resultado).toEqual({
      ok: true,
      data: [
        { producto_id: "p-1", sku: "DP-001" },
        { producto_id: "p-2", sku: "DP-002" },
      ],
    });
    expect(builder.upsert).toHaveBeenCalledWith(
      [
        { cliente_id: CLIENTE_ID, sku: "DP-001", nombre: "Yerba Mate 1kg", precio: 3500, categoria: "Almacén" },
        { cliente_id: CLIENTE_ID, sku: "DP-002", nombre: "Fideos 500g", precio: 900, categoria: "Almacén" },
      ],
      { onConflict: "cliente_id,sku", ignoreDuplicates: true },
    );
  });

  it("solo devuelve las filas que efectivamente se insertaron, dejando fuera los SKU que ya existían", async () => {
    const builder = crearBuilderUpsert({ data: [{ producto_id: "p-1", sku: "DP-001" }], error: null });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await insertarProductosEnLote(supabase as never, CLIENTE_ID, productos);

    expect(resultado.ok && resultado.data).toEqual([{ producto_id: "p-1", sku: "DP-001" }]);
  });

  it("retorna NX-SYS-001 si Supabase devuelve error", async () => {
    const builder = crearBuilderUpsert({ data: null, error: { message: "fallo" } });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await insertarProductosEnLote(supabase as never, CLIENTE_ID, productos);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-001" });
  });
});

function crearBuilderBusqueda(resultado: { data: unknown; error: unknown }) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    or: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    returns: vi.fn(async () => resultado),
  };
  return builder;
}

describe("buscarProductosParaVenta", () => {
  it("retorna [] sin consultar Supabase cuando el término está vacío", async () => {
    const supabase = { from: vi.fn() };

    const resultado = await buscarProductosParaVenta(supabase as never, CLIENTE_ID, "   ");

    expect(resultado).toEqual({ ok: true, data: [] });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("retorna [] sin consultar Supabase cuando el término sanitizado queda vacío (solo caracteres de control del filtro)", async () => {
    const supabase = { from: vi.fn() };

    const resultado = await buscarProductosParaVenta(supabase as never, CLIENTE_ID, ",()" );

    expect(resultado).toEqual({ ok: true, data: [] });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("busca por sku o nombre con ILIKE, scopeado al tenant y sin productos eliminados", async () => {
    const builder = crearBuilderBusqueda({ data: [], error: null });
    const supabase = { from: vi.fn(() => builder) };

    await buscarProductosParaVenta(supabase as never, CLIENTE_ID, "yerba");

    expect(builder.eq).toHaveBeenCalledWith("cliente_id", CLIENTE_ID);
    expect(builder.is).toHaveBeenCalledWith("eliminado_en", null);
    expect(builder.or).toHaveBeenCalledWith("sku.ilike.%yerba%,nombre.ilike.%yerba%");
  });

  it("elimina comas y paréntesis del término (romperían la sintaxis del filtro .or())", async () => {
    const builder = crearBuilderBusqueda({ data: [], error: null });
    const supabase = { from: vi.fn(() => builder) };

    await buscarProductosParaVenta(supabase as never, CLIENTE_ID, "yerba(1kg),oferta");

    expect(builder.or).toHaveBeenCalledWith("sku.ilike.%yerba1kgoferta%,nombre.ilike.%yerba1kgoferta%");
  });

  it("escapa los comodines % y _ de LIKE para que se busquen de forma literal", async () => {
    const builder = crearBuilderBusqueda({ data: [], error: null });
    const supabase = { from: vi.fn(() => builder) };

    await buscarProductosParaVenta(supabase as never, CLIENTE_ID, "50%_off");

    expect(builder.or).toHaveBeenCalledWith("sku.ilike.%50\\%\\_off%,nombre.ilike.%50\\%\\_off%");
  });

  it("aplica LIMITE_BUSQUEDA_PRODUCTOS por defecto y nunca deja pedir más que ese tope", async () => {
    const builder = crearBuilderBusqueda({ data: [], error: null });
    const supabase = { from: vi.fn(() => builder) };

    await buscarProductosParaVenta(supabase as never, CLIENTE_ID, "yerba");
    expect(builder.limit).toHaveBeenCalledWith(LIMITE_BUSQUEDA_PRODUCTOS);

    await buscarProductosParaVenta(supabase as never, CLIENTE_ID, "yerba", 500);
    expect(builder.limit).toHaveBeenCalledWith(LIMITE_BUSQUEDA_PRODUCTOS);
  });

  it("retorna las filas encontradas", async () => {
    const filas = [{ producto_id: "p-1", sku: "DP-00001", nombre: "Yerba Mate 1kg", precio: 3500, stock_actual: 12 }];
    const builder = crearBuilderBusqueda({ data: filas, error: null });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await buscarProductosParaVenta(supabase as never, CLIENTE_ID, "yerba");

    expect(resultado).toEqual({ ok: true, data: filas });
  });

  it("retorna NX-SYS-001 si Supabase devuelve error", async () => {
    const builder = crearBuilderBusqueda({ data: null, error: { message: "fallo" } });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await buscarProductosParaVenta(supabase as never, CLIENTE_ID, "yerba");

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
