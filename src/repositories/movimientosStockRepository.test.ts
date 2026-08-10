import { describe, expect, it, vi } from "vitest";

import { MOVIMIENTOS_STOCK_POR_PAGINA, obtenerMovimientosStockPaginados } from "./movimientosStockRepository";

function crearBuilderListado(resultado: { data: unknown; error: unknown; count?: number | null }) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    returns: vi.fn(async () => resultado),
  };
  return builder;
}

const CLIENTE_ID = "a1111111-1111-4111-8111-111111111111";
const PRODUCTO_ID = "b1111111-1111-4111-8111-111111111111";

describe("obtenerMovimientosStockPaginados", () => {
  it("usa .range() según la página y el límite pedidos, nunca trae todo sin límite", async () => {
    const builder = crearBuilderListado({ data: [], error: null, count: 0 });
    const supabase = { from: vi.fn(() => builder) };

    await obtenerMovimientosStockPaginados(supabase as never, CLIENTE_ID, 2, 25);

    expect(builder.range).toHaveBeenCalledWith(25, 49);
  });

  it("ordena con movimiento_id como desempate para no repetir/saltear filas cuando varias comparten creado_en", async () => {
    const builder = crearBuilderListado({ data: [], error: null, count: 0 });
    const supabase = { from: vi.fn(() => builder) };

    await obtenerMovimientosStockPaginados(supabase as never, CLIENTE_ID, 1, MOVIMIENTOS_STOCK_POR_PAGINA);

    expect(builder.order).toHaveBeenNthCalledWith(1, "creado_en", { ascending: false });
    expect(builder.order).toHaveBeenNthCalledWith(2, "movimiento_id", { ascending: true });
  });

  it("filtra siempre por cliente_id, sin filtrar por producto_id cuando no se pasa", async () => {
    const builder = crearBuilderListado({ data: [], error: null, count: 0 });
    const supabase = { from: vi.fn(() => builder) };

    await obtenerMovimientosStockPaginados(supabase as never, CLIENTE_ID, 1, MOVIMIENTOS_STOCK_POR_PAGINA);

    expect(builder.eq).toHaveBeenCalledWith("cliente_id", CLIENTE_ID);
    expect(builder.eq).toHaveBeenCalledTimes(1);
  });

  it("filtra también por producto_id cuando se pasa (calza con idx_movstock_producto)", async () => {
    const builder = crearBuilderListado({ data: [], error: null, count: 0 });
    const supabase = { from: vi.fn(() => builder) };

    await obtenerMovimientosStockPaginados(supabase as never, CLIENTE_ID, 1, MOVIMIENTOS_STOCK_POR_PAGINA, PRODUCTO_ID);

    expect(builder.eq).toHaveBeenCalledWith("cliente_id", CLIENTE_ID);
    expect(builder.eq).toHaveBeenCalledWith("producto_id", PRODUCTO_ID);
  });

  it("aplana el nombre y SKU del producto embebido, con un valor por defecto si la FK viene nula", async () => {
    const filas = [
      {
        movimiento_id: "m-1",
        producto_id: PRODUCTO_ID,
        tipo: "entrada",
        cantidad: 10,
        saldo_resultante: 40,
        creado_en: "2026-08-10T12:00:00.000Z",
        productos: { nombre: "Yerba Mate 1kg", sku: "DP-00001" },
      },
      {
        movimiento_id: "m-2",
        producto_id: "producto-eliminado",
        tipo: "salida",
        cantidad: 5,
        saldo_resultante: 0,
        creado_en: "2026-08-10T11:00:00.000Z",
        productos: null,
      },
    ];
    const builder = crearBuilderListado({ data: filas, error: null, count: 2 });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await obtenerMovimientosStockPaginados(supabase as never, CLIENTE_ID, 1, MOVIMIENTOS_STOCK_POR_PAGINA);

    expect(resultado).toEqual({
      ok: true,
      data: {
        movimientos: [
          {
            movimiento_id: "m-1",
            producto_id: PRODUCTO_ID,
            producto_nombre: "Yerba Mate 1kg",
            producto_sku: "DP-00001",
            tipo: "entrada",
            cantidad: 10,
            saldo_resultante: 40,
            creado_en: "2026-08-10T12:00:00.000Z",
          },
          {
            movimiento_id: "m-2",
            producto_id: "producto-eliminado",
            producto_nombre: "—",
            producto_sku: "—",
            tipo: "salida",
            cantidad: 5,
            saldo_resultante: 0,
            creado_en: "2026-08-10T11:00:00.000Z",
          },
        ],
        total: 2,
        pagina: 1,
        porPagina: MOVIMIENTOS_STOCK_POR_PAGINA,
      },
    });
  });

  it("normaliza página y límite inválidos a los valores por defecto", async () => {
    const builder = crearBuilderListado({ data: [], error: null, count: 0 });
    const supabase = { from: vi.fn(() => builder) };

    await obtenerMovimientosStockPaginados(supabase as never, CLIENTE_ID, -3, 0);

    expect(builder.range).toHaveBeenCalledWith(0, MOVIMIENTOS_STOCK_POR_PAGINA - 1);
  });

  it("retorna NX-SYS-001 si Supabase devuelve error", async () => {
    const builder = crearBuilderListado({ data: null, error: { message: "fallo" }, count: null });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await obtenerMovimientosStockPaginados(supabase as never, CLIENTE_ID, 1, MOVIMIENTOS_STOCK_POR_PAGINA);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-001" });
  });
});
