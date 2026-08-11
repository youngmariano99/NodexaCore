import { describe, expect, it, vi } from "vitest";

import { obtenerUsoCuotaIA, registrarCargaIa, registrarConsumoIa } from "./cargasIaRepository";

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

function crearBuilderClienteCuota(resultado: { data: unknown; error: unknown }) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    single: vi.fn(async () => resultado),
  };
  return builder;
}

function crearBuilderConteoCargas(resultado: { count: number | null; error: unknown }) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gte: vi.fn(async () => resultado),
  };
  return builder;
}

function crearSupabasePorTabla(builders: { clientes: unknown; cargas_ia: unknown }) {
  return {
    from: vi.fn((tabla: string) => (tabla === "clientes" ? builders.clientes : builders.cargas_ia)),
  };
}

describe("obtenerUsoCuotaIA", () => {
  it("cuenta filas de cargas_ia filtradas por cliente_id y por el ia_periodo_actual vigente del tenant", async () => {
    const builderClientes = crearBuilderClienteCuota({
      data: { cuota_mensual_ia: 40, ia_periodo_actual: "2026-08-01" },
      error: null,
    });
    const builderCargas = crearBuilderConteoCargas({ count: 34, error: null });
    const supabase = crearSupabasePorTabla({ clientes: builderClientes, cargas_ia: builderCargas });

    const resultado = await obtenerUsoCuotaIA(supabase as never, CLIENTE_ID);

    expect(resultado).toEqual({ ok: true, data: { usadas: 34, cuotaMensualIa: 40 } });
    expect(builderCargas.eq).toHaveBeenCalledWith("cliente_id", CLIENTE_ID);
    expect(builderCargas.gte).toHaveBeenCalledWith("creado_en", "2026-08-01");
  });

  it("retorna NX-SYS-001 si no encuentra al cliente", async () => {
    const builderClientes = crearBuilderClienteCuota({ data: null, error: { message: "no encontrado" } });
    const builderCargas = crearBuilderConteoCargas({ count: 0, error: null });
    const supabase = crearSupabasePorTabla({ clientes: builderClientes, cargas_ia: builderCargas });

    const resultado = await obtenerUsoCuotaIA(supabase as never, CLIENTE_ID);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-001" });
  });

  it("retorna NX-SYS-001 si el conteo de cargas_ia falla", async () => {
    const builderClientes = crearBuilderClienteCuota({
      data: { cuota_mensual_ia: 40, ia_periodo_actual: "2026-08-01" },
      error: null,
    });
    const builderCargas = crearBuilderConteoCargas({ count: null, error: { message: "fallo" } });
    const supabase = crearSupabasePorTabla({ clientes: builderClientes, cargas_ia: builderCargas });

    const resultado = await obtenerUsoCuotaIA(supabase as never, CLIENTE_ID);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-001" });
  });

  it("refleja el reinicio a 0 cuando cambia el período mensual vigente", async () => {
    const builderClientes = crearBuilderClienteCuota({
      data: { cuota_mensual_ia: 40, ia_periodo_actual: "2026-09-01" },
      error: null,
    });
    const builderCargas = crearBuilderConteoCargas({ count: 0, error: null });
    const supabase = crearSupabasePorTabla({ clientes: builderClientes, cargas_ia: builderCargas });

    const resultado = await obtenerUsoCuotaIA(supabase as never, CLIENTE_ID);

    expect(resultado).toEqual({ ok: true, data: { usadas: 0, cuotaMensualIa: 40 } });
  });
});
