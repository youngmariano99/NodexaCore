import { beforeEach, describe, expect, it, vi } from "vitest";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";

import { actualizarFacturacionRecurrente } from "./actualizarFacturacionRecurrente";

vi.mock("@/lib/auditoria/registrarDiff", () => ({
  registrarDiff: vi.fn(),
}));

interface ResultadoSupabase {
  data: unknown;
  error: unknown;
}

function crearBuilderInsert(resultado: ResultadoSupabase) {
  const builder = {
    insert: vi.fn(() => builder),
    select: vi.fn(() => builder),
    single: vi.fn(async () => resultado),
  };
  return builder;
}

const CLIENTE_ID = "b2222222-2222-4222-8222-222222222222";
const USUARIO_ID_ADMIN = "d0000000-0000-4000-8000-000000000001";
const AJUSTE_ID = "e1111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("actualizarFacturacionRecurrente", () => {
  it("inserta el ajuste con el período de facturación del mes siguiente", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 7, 12))); // 12 de agosto 2026 (UTC)

    const builder = crearBuilderInsert({
      data: {
        ajuste_facturacion_id: AJUSTE_ID,
        cliente_id: CLIENTE_ID,
        concepto: "pack_sku",
        monto: 5000,
        periodo_facturado: "2026-09-01",
      },
      error: null,
    });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await actualizarFacturacionRecurrente(supabase as never, {
      clienteId: CLIENTE_ID,
      usuarioId: USUARIO_ID_ADMIN,
      concepto: "pack_sku",
      monto: 5000,
    });

    expect(resultado).toEqual({
      ok: true,
      data: {
        ajuste_facturacion_id: AJUSTE_ID,
        cliente_id: CLIENTE_ID,
        concepto: "pack_sku",
        monto: 5000,
        periodo_facturado: "2026-09-01",
      },
    });

    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        cliente_id: CLIENTE_ID,
        concepto: "pack_sku",
        monto: 5000,
        periodo_facturado: "2026-09-01",
      }),
    );
  });

  it("calcula diciembre → enero del año siguiente correctamente", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 11, 20))); // 20 de diciembre 2026

    const builder = crearBuilderInsert({
      data: {
        ajuste_facturacion_id: AJUSTE_ID,
        cliente_id: CLIENTE_ID,
        concepto: "recarga_ia",
        monto: 3000,
        periodo_facturado: "2027-01-01",
      },
      error: null,
    });
    const supabase = { from: vi.fn(() => builder) };

    await actualizarFacturacionRecurrente(supabase as never, {
      clienteId: CLIENTE_ID,
      usuarioId: USUARIO_ID_ADMIN,
      concepto: "recarga_ia",
      monto: 3000,
    });

    expect(builder.insert).toHaveBeenCalledWith(expect.objectContaining({ periodo_facturado: "2027-01-01" }));
  });

  it("registra un diff con el detalle del ajuste", async () => {
    const builder = crearBuilderInsert({
      data: {
        ajuste_facturacion_id: AJUSTE_ID,
        cliente_id: CLIENTE_ID,
        concepto: "pack_sku",
        monto: 4000,
        periodo_facturado: "2026-09-01",
      },
      error: null,
    });
    const supabase = { from: vi.fn(() => builder) };

    await actualizarFacturacionRecurrente(supabase as never, {
      clienteId: CLIENTE_ID,
      usuarioId: USUARIO_ID_ADMIN,
      concepto: "pack_sku",
      monto: 4000,
    });

    expect(registrarDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: CLIENTE_ID,
        usuarioId: USUARIO_ID_ADMIN,
        tablaAfectada: "ajustes_facturacion",
        registroId: AJUSTE_ID,
        campoModificado: "monto",
        valorAnterior: null,
        valorNuevo: JSON.stringify({ concepto: "pack_sku", monto: 4000, periodoFacturado: "2026-09-01" }),
      }),
    );
  });

  it("retorna NX-SYS-001 ante un fallo del insert y no registra diff", async () => {
    const builder = crearBuilderInsert({ data: null, error: { message: "fallo de conexión" } });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await actualizarFacturacionRecurrente(supabase as never, {
      clienteId: CLIENTE_ID,
      usuarioId: USUARIO_ID_ADMIN,
      concepto: "recarga_ia",
      monto: 3000,
    });

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-001" });
    expect(registrarDiff).not.toHaveBeenCalled();
  });
});
