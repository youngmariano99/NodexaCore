import { describe, expect, it, vi } from "vitest";

import { registrarCargaIa, registrarConsumoIa } from "./cargasIaRepository";

const CLIENTE_ID = "b2222222-2222-4222-8222-222222222222";
const USUARIO_ID = "d0000000-0000-4000-8000-000000000004";

describe("registrarConsumoIa", () => {
  it("retorna ok cuando el RPC no devuelve error", async () => {
    const supabase = { rpc: vi.fn(async () => ({ data: {}, error: null })) };

    const resultado = await registrarConsumoIa(supabase as never);

    expect(resultado).toEqual({ ok: true, data: null });
    expect(supabase.rpc).toHaveBeenCalledWith("fn_registrar_consumo_ia");
  });

  it("retorna NX-IA-002 cuando el RPC señala cuota agotada (SQLSTATE NX005)", async () => {
    const supabase = { rpc: vi.fn(async () => ({ data: null, error: { code: "NX005", message: "cuota agotada" } })) };

    const resultado = await registrarConsumoIa(supabase as never);

    expect(resultado).toEqual({ ok: false, error: "NX-IA-002" });
  });

  it("retorna NX-SYS-007 cuando el RPC no encuentra el comercio (SQLSTATE P0002)", async () => {
    const supabase = { rpc: vi.fn(async () => ({ data: null, error: { code: "P0002", message: "no encontrado" } })) };

    const resultado = await registrarConsumoIa(supabase as never);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-007" });
  });

  it("retorna NX-SYS-001 ante cualquier otro error del RPC", async () => {
    const supabase = { rpc: vi.fn(async () => ({ data: null, error: { message: "fallo de conexión" } })) };

    const resultado = await registrarConsumoIa(supabase as never);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-001" });
  });
});

function crearBuilderInsert(resultado: { data: unknown; error: unknown }) {
  const builder = {
    insert: vi.fn(() => builder),
    select: vi.fn(() => builder),
    single: vi.fn(async () => resultado),
  };
  return builder;
}

describe("registrarCargaIa", () => {
  const datos = {
    clienteId: CLIENTE_ID,
    usuarioId: USUARIO_ID,
    imagenUrl: "https://res.cloudinary.com/nodexa/cargas-ia/etiqueta.webp",
    resultadoExtraido: { nombre: "Tornillo 3/4", precio: 120, categoria: "Tornillería" },
  };

  it("inserta la carga con producto_id NULL y el resultado extraído", async () => {
    const filaCreada = {
      carga_ia_id: "c-1",
      cliente_id: CLIENTE_ID,
      usuario_id: USUARIO_ID,
      producto_id: null,
      imagen_url: datos.imagenUrl,
      resultado_extraido: datos.resultadoExtraido,
      creado_en: "2026-08-11T10:00:00.000Z",
    };
    const builder = crearBuilderInsert({ data: filaCreada, error: null });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await registrarCargaIa(supabase as never, datos);

    expect(resultado).toEqual({ ok: true, data: filaCreada });
    expect(builder.insert).toHaveBeenCalledWith({
      cliente_id: CLIENTE_ID,
      usuario_id: USUARIO_ID,
      producto_id: null,
      imagen_url: datos.imagenUrl,
      resultado_extraido: datos.resultadoExtraido,
    });
  });

  it("acepta resultado_extraido NULL cuando la extracción falló", async () => {
    const filaCreada = {
      carga_ia_id: "c-2",
      cliente_id: CLIENTE_ID,
      usuario_id: USUARIO_ID,
      producto_id: null,
      imagen_url: datos.imagenUrl,
      resultado_extraido: null,
      creado_en: "2026-08-11T10:00:00.000Z",
    };
    const builder = crearBuilderInsert({ data: filaCreada, error: null });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await registrarCargaIa(supabase as never, { ...datos, resultadoExtraido: null });

    expect(resultado).toEqual({ ok: true, data: filaCreada });
  });

  it("retorna NX-SYS-001 si Supabase devuelve error", async () => {
    const builder = crearBuilderInsert({ data: null, error: { message: "fallo" } });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await registrarCargaIa(supabase as never, datos);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-001" });
  });
});
