import { describe, expect, it, vi } from "vitest";

import {
  MOVIMIENTOS_CUENTA_CORRIENTE_POR_PAGINA,
  obtenerMovimientosCuentaCorrientePaginados,
} from "./movimientosCuentaCorrienteRepository";

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

const CLIENTE_FINAL_ID = "c0f11111-1111-4111-8111-111111111111";

describe("obtenerMovimientosCuentaCorrientePaginados", () => {
  it("filtra por cliente_final_id (calza con idx_movcc_clientefinal)", async () => {
    const builder = crearBuilderListado({ data: [], error: null, count: 0 });
    const supabase = { from: vi.fn(() => builder) };

    await obtenerMovimientosCuentaCorrientePaginados(supabase as never, CLIENTE_FINAL_ID, 1);

    expect(builder.eq).toHaveBeenCalledWith("cliente_final_id", CLIENTE_FINAL_ID);
  });

  it("ordena por creado_en descendente con movimiento_cc_id como desempate", async () => {
    const builder = crearBuilderListado({ data: [], error: null, count: 0 });
    const supabase = { from: vi.fn(() => builder) };

    await obtenerMovimientosCuentaCorrientePaginados(supabase as never, CLIENTE_FINAL_ID, 1);

    expect(builder.order).toHaveBeenNthCalledWith(1, "creado_en", { ascending: false });
    expect(builder.order).toHaveBeenNthCalledWith(2, "movimiento_cc_id", { ascending: true });
  });

  it("usa .range() según la página y el límite pedidos", async () => {
    const builder = crearBuilderListado({ data: [], error: null, count: 0 });
    const supabase = { from: vi.fn(() => builder) };

    await obtenerMovimientosCuentaCorrientePaginados(supabase as never, CLIENTE_FINAL_ID, 2, 25);

    expect(builder.range).toHaveBeenCalledWith(25, 49);
  });

  it("normaliza página y límite inválidos a los valores por defecto", async () => {
    const builder = crearBuilderListado({ data: [], error: null, count: 0 });
    const supabase = { from: vi.fn(() => builder) };

    await obtenerMovimientosCuentaCorrientePaginados(supabase as never, CLIENTE_FINAL_ID, -3, 0);

    expect(builder.range).toHaveBeenCalledWith(0, MOVIMIENTOS_CUENTA_CORRIENTE_POR_PAGINA - 1);
  });

  it("retorna cargos y pagos junto con el total, la página y el límite pedidos", async () => {
    const filas = [
      {
        movimiento_cc_id: "m-1",
        tipo: "cargo",
        monto: 6519.72,
        venta_id: "v-1",
        creado_en: "2026-08-11T12:00:00.000Z",
      },
      {
        movimiento_cc_id: "m-2",
        tipo: "pago",
        monto: 400,
        venta_id: null,
        creado_en: "2026-08-11T11:00:00.000Z",
      },
    ];
    const builder = crearBuilderListado({ data: filas, error: null, count: 2 });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await obtenerMovimientosCuentaCorrientePaginados(
      supabase as never,
      CLIENTE_FINAL_ID,
      1,
      MOVIMIENTOS_CUENTA_CORRIENTE_POR_PAGINA,
    );

    expect(resultado).toEqual({
      ok: true,
      data: {
        movimientos: filas,
        total: 2,
        pagina: 1,
        porPagina: MOVIMIENTOS_CUENTA_CORRIENTE_POR_PAGINA,
      },
    });
  });

  it("retorna NX-SYS-001 si Supabase devuelve error", async () => {
    const builder = crearBuilderListado({ data: null, error: { message: "fallo" }, count: null });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await obtenerMovimientosCuentaCorrientePaginados(
      supabase as never,
      CLIENTE_FINAL_ID,
      1,
      MOVIMIENTOS_CUENTA_CORRIENTE_POR_PAGINA,
    );

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-001" });
  });
});
