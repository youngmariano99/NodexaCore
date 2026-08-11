import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  obtenerTodasLasVentasActivas,
  obtenerTodosLosVentaItemsActivos,
  obtenerVentaItemsPaginados,
  obtenerVentasPaginadas,
  TAMANIO_PAGINA_EXPORTACION_VENTAS,
} from "./ventas";

vi.mock("@/lib/auditoria/registrarDiff", () => ({
  registrarDiff: vi.fn(),
}));

vi.mock("@/repositories/base/verificarPertenenciaTenant", () => ({
  verificarPertenenciaTenant: vi.fn(),
}));

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

const CLIENTE_ID = "b2222222-2222-4222-8222-222222222222";

function crearVenta(indice: number) {
  return {
    venta_id: `v-${indice}`,
    cliente_final_id: null,
    total: 1000,
    estado: "confirmada",
    creado_en: "2026-08-01T10:00:00.000Z",
  };
}

function crearVentaItemConVentaEmbebida(indice: number) {
  return {
    venta_item_id: `vi-${indice}`,
    venta_id: `v-${indice}`,
    producto_id: `p-${indice}`,
    cantidad: 1,
    precio_unitario: 100,
    subtotal: 100,
    ventas: { cliente_id: CLIENTE_ID },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("obtenerVentasPaginadas", () => {
  it("filtra por cliente_id y eliminado_en IS NULL, usando .range() sin traer todo", async () => {
    const builder = crearBuilderListado({ data: [], error: null, count: 0 });
    const supabase = { from: vi.fn(() => builder) };

    await obtenerVentasPaginadas(supabase as never, CLIENTE_ID, 1, 25);

    expect(builder.eq).toHaveBeenCalledWith("cliente_id", CLIENTE_ID);
    expect(builder.is).toHaveBeenCalledWith("eliminado_en", null);
    expect(builder.range).toHaveBeenCalledWith(0, 24);
  });

  it("retorna las ventas y el total exacto", async () => {
    const ventas = [crearVenta(1), crearVenta(2)];
    const builder = crearBuilderListado({ data: ventas, error: null, count: 50 });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await obtenerVentasPaginadas(supabase as never, CLIENTE_ID, 1, 25);

    expect(resultado).toEqual({ ok: true, data: { ventas, total: 50 } });
  });

  it("retorna NX-SYS-001 si Supabase devuelve error", async () => {
    const builder = crearBuilderListado({ data: null, error: { message: "fallo" }, count: null });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await obtenerVentasPaginadas(supabase as never, CLIENTE_ID, 1, 25);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-001" });
  });
});

describe("obtenerVentaItemsPaginados", () => {
  it("filtra por ventas.cliente_id vía el join embebido (venta_items no tiene cliente_id propio)", async () => {
    const builder = crearBuilderListado({ data: [], error: null, count: 0 });
    const supabase = { from: vi.fn(() => builder) };

    await obtenerVentaItemsPaginados(supabase as never, CLIENTE_ID, 1, 25);

    expect(builder.eq).toHaveBeenCalledWith("ventas.cliente_id", CLIENTE_ID);
  });

  it("retorna los items sin el campo 'ventas' embebido usado solo para filtrar", async () => {
    const items = [crearVentaItemConVentaEmbebida(1)];
    const builder = crearBuilderListado({ data: items, error: null, count: 1 });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await obtenerVentaItemsPaginados(supabase as never, CLIENTE_ID, 1, 25);

    expect(resultado).toEqual({
      ok: true,
      data: {
        items: [
          {
            venta_item_id: "vi-1",
            venta_id: "v-1",
            producto_id: "p-1",
            cantidad: 1,
            precio_unitario: 100,
            subtotal: 100,
          },
        ],
        total: 1,
      },
    });
  });

  it("retorna NX-SYS-001 si Supabase devuelve error", async () => {
    const builder = crearBuilderListado({ data: null, error: { message: "fallo" }, count: null });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await obtenerVentaItemsPaginados(supabase as never, CLIENTE_ID, 1, 25);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-001" });
  });
});

describe("obtenerTodasLasVentasActivas", () => {
  it("acumula una sola página cuando el total entra en una sola consulta", async () => {
    const ventas = [crearVenta(1), crearVenta(2)];
    const builder = crearBuilderListado({ data: ventas, error: null, count: 2 });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await obtenerTodasLasVentasActivas(supabase as never, CLIENTE_ID);

    expect(resultado).toEqual({ ok: true, data: ventas });
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it("pagina internamente hasta agotar el total real (2 páginas de 500 con total 600)", async () => {
    const pagina1 = Array.from({ length: TAMANIO_PAGINA_EXPORTACION_VENTAS }, (_, i) => crearVenta(i + 1));
    const pagina2 = Array.from({ length: 100 }, (_, i) => crearVenta(i + 501));

    const builderPagina1 = crearBuilderListado({ data: pagina1, error: null, count: 600 });
    const builderPagina2 = crearBuilderListado({ data: pagina2, error: null, count: 600 });
    const supabase = { from: vi.fn().mockReturnValueOnce(builderPagina1).mockReturnValueOnce(builderPagina2) };

    const resultado = await obtenerTodasLasVentasActivas(supabase as never, CLIENTE_ID);

    expect(resultado.ok).toBe(true);
    expect(resultado.ok && resultado.data).toHaveLength(600);
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });

  it("retorna un arreglo vacío para un tenant sin ventas, sin loopear", async () => {
    const builder = crearBuilderListado({ data: [], error: null, count: 0 });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await obtenerTodasLasVentasActivas(supabase as never, CLIENTE_ID);

    expect(resultado).toEqual({ ok: true, data: [] });
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it("propaga NX-SYS-001 si alguna página intermedia falla", async () => {
    const pagina1 = Array.from({ length: TAMANIO_PAGINA_EXPORTACION_VENTAS }, (_, i) => crearVenta(i + 1));
    const builderPagina1 = crearBuilderListado({ data: pagina1, error: null, count: 600 });
    const builderPagina2 = crearBuilderListado({ data: null, error: { message: "fallo" }, count: null });
    const supabase = { from: vi.fn().mockReturnValueOnce(builderPagina1).mockReturnValueOnce(builderPagina2) };

    const resultado = await obtenerTodasLasVentasActivas(supabase as never, CLIENTE_ID);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-001" });
  });
});

describe("obtenerTodosLosVentaItemsActivos", () => {
  it("pagina internamente hasta agotar el total real", async () => {
    const pagina1 = Array.from({ length: TAMANIO_PAGINA_EXPORTACION_VENTAS }, (_, i) =>
      crearVentaItemConVentaEmbebida(i + 1),
    );
    const pagina2 = Array.from({ length: 50 }, (_, i) => crearVentaItemConVentaEmbebida(i + 501));

    const builderPagina1 = crearBuilderListado({ data: pagina1, error: null, count: 550 });
    const builderPagina2 = crearBuilderListado({ data: pagina2, error: null, count: 550 });
    const supabase = { from: vi.fn().mockReturnValueOnce(builderPagina1).mockReturnValueOnce(builderPagina2) };

    const resultado = await obtenerTodosLosVentaItemsActivos(supabase as never, CLIENTE_ID);

    expect(resultado.ok).toBe(true);
    expect(resultado.ok && resultado.data).toHaveLength(550);
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });
});
