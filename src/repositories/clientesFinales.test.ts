import { describe, expect, it, vi } from "vitest";

import { insertarClienteFinal } from "./clientesFinales";

vi.mock("@/lib/auditoria/registrarDiff", () => ({
  registrarDiff: vi.fn(),
}));

const CLIENTE_ID = "a1111111-1111-4111-8111-111111111111";

function crearBuilderInsert(resultado: { data: unknown; error: unknown }) {
  const builder = {
    insert: vi.fn(() => builder),
    select: vi.fn(() => builder),
    single: vi.fn(async () => resultado),
  };
  return builder;
}

describe("insertarClienteFinal", () => {
  it("inserta con cliente_id/nombre/telefono, sin enviar saldo_deudor (usa el DEFAULT 0 de la columna)", async () => {
    const filaCreada = {
      cliente_final_id: "cf-1",
      cliente_id: CLIENTE_ID,
      nombre: "Juan Pérez",
      telefono: "+5492920001111",
      saldo_deudor: 0,
    };
    const builder = crearBuilderInsert({ data: filaCreada, error: null });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await insertarClienteFinal(supabase as never, {
      clienteId: CLIENTE_ID,
      nombre: "Juan Pérez",
      telefono: "+5492920001111",
    });

    expect(resultado).toEqual({ ok: true, data: filaCreada });
    expect(builder.insert).toHaveBeenCalledWith({
      cliente_id: CLIENTE_ID,
      nombre: "Juan Pérez",
      telefono: "+5492920001111",
      limite_credito: 0,
      cuit_cuil: null,
      email: null,
      estado: "activo",
    });

  });

  it("acepta telefono NULL (opcional, docs/SCHEMA.md §9)", async () => {
    const filaCreada = {
      cliente_final_id: "cf-2",
      cliente_id: CLIENTE_ID,
      nombre: "María López",
      telefono: null,
      saldo_deudor: 0,
    };
    const builder = crearBuilderInsert({ data: filaCreada, error: null });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await insertarClienteFinal(supabase as never, {
      clienteId: CLIENTE_ID,
      nombre: "María López",
      telefono: null,
    });

    expect(resultado).toEqual({ ok: true, data: filaCreada });
  });

  it("retorna NX-FIA-005 ante una violación del índice único de teléfono por tenant (23505)", async () => {
    const builder = crearBuilderInsert({
      data: null,
      error: { code: "23505", message: "duplicate key value violates unique constraint" },
    });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await insertarClienteFinal(supabase as never, {
      clienteId: CLIENTE_ID,
      nombre: "Juan Pérez (repetido)",
      telefono: "+5492920001111",
    });

    expect(resultado).toEqual({ ok: false, error: "NX-FIA-005" });
  });

  it("retorna NX-SYS-001 ante cualquier otro error de Supabase", async () => {
    const builder = crearBuilderInsert({ data: null, error: { message: "fallo de conexión" } });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await insertarClienteFinal(supabase as never, {
      clienteId: CLIENTE_ID,
      nombre: "Juan Pérez",
      telefono: null,
    });

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-001" });
  });
});
