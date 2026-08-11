import { describe, expect, it, vi } from "vitest";

import { CLIENTES_POR_PAGINA, listarClientesPaginado, obtenerClientePorId, obtenerClientePublicoPorSlug } from "./clientes";

interface ResultadoSupabase {
  data: unknown;
  error: unknown;
  count?: number | null;
}

function crearBuilderListado(resultado: ResultadoSupabase) {
  const builder = {
    select: vi.fn(() => builder),
    is: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    returns: vi.fn(async () => resultado),
  };
  return builder;
}

function crearBuilderDetalle(resultado: ResultadoSupabase) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    single: vi.fn(async () => resultado),
  };
  return builder;
}

const CLIENTE_ID = "a1111111-1111-4111-8111-111111111111";

describe("listarClientesPaginado", () => {
  it("pagina con .range() según el número de página solicitado, nunca trae todo sin límite", async () => {
    const builder = crearBuilderListado({ data: [], error: null, count: 0 });
    const supabase = { from: vi.fn(() => builder) };

    await listarClientesPaginado(supabase as never, 3);

    expect(builder.range).toHaveBeenCalledWith(40, 59); // página 3, 20 por página: [40,59]
  });

  it("normaliza páginas inválidas (0, negativas, no numéricas) a la página 1", async () => {
    const builder = crearBuilderListado({ data: [], error: null, count: 0 });
    const supabase = { from: vi.fn(() => builder) };

    await listarClientesPaginado(supabase as never, -5);

    expect(builder.range).toHaveBeenCalledWith(0, CLIENTES_POR_PAGINA - 1);
  });

  it("retorna los clientes, el total y el tamaño de página", async () => {
    const filas = [
      {
        cliente_id: CLIENTE_ID,
        nombre_comercio: "Almacén Don Pedro",
        slug: "almacen-don-pedro",
        estado_pago: true,
        limite_sku: 1000,
        creado_en: "2026-08-05T00:00:00Z",
        tenant_modules: [{ modulo: "fiados", activo: true }],
      },
    ];
    const builder = crearBuilderListado({ data: filas, error: null, count: 42 });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await listarClientesPaginado(supabase as never, 1);

    expect(resultado).toEqual({
      ok: true,
      data: { clientes: filas, total: 42, porPagina: CLIENTES_POR_PAGINA },
    });
  });

  it("retorna NX-SYS-001 si Supabase devuelve error", async () => {
    const builder = crearBuilderListado({ data: null, error: { message: "fallo" }, count: null });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await listarClientesPaginado(supabase as never, 1);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-001" });
  });
});

describe("obtenerClientePorId", () => {
  it("retorna el detalle del cliente cuando existe", async () => {
    const fila = {
      cliente_id: CLIENTE_ID,
      nombre_comercio: "Almacén Don Pedro",
      slug: "almacen-don-pedro",
      estado_pago: true,
      limite_sku: 1000,
      packs_sku_contratados: 0,
      telefono_whatsapp: "+5492920000001",
      dominio_personalizado: null,
      creado_en: "2026-08-05T00:00:00Z",
      tenant_modules: [{ modulo: "fiados", activo: true }],
    };
    const builder = crearBuilderDetalle({ data: fila, error: null });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await obtenerClientePorId(supabase as never, CLIENTE_ID);

    expect(resultado).toEqual({ ok: true, data: fila });
  });

  it("retorna NX-SYS-004 cuando el cliente no existe", async () => {
    const builder = crearBuilderDetalle({ data: null, error: { message: "no encontrado" } });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await obtenerClientePorId(supabase as never, "no-existe");

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-004" });
  });
});

function crearBuilderPublico(resultado: ResultadoSupabase) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => resultado),
  };
  return builder;
}

describe("obtenerClientePublicoPorSlug", () => {
  const SLUG = "almacen-don-pedro";

  it("retorna solo columnas públicas cuando el comercio existe y está activo", async () => {
    const filaPublica = {
      cliente_id: CLIENTE_ID,
      nombre_comercio: "Almacén Don Pedro",
      slug: SLUG,
      logo_url: "https://cdn.nodexa.app/logos/don-pedro.webp",
      color_primario: "#10B981",
      telefono_whatsapp: "+5492920000001",
    };
    const builder = crearBuilderPublico({ data: filaPublica, error: null });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await obtenerClientePublicoPorSlug(supabase as never, SLUG);

    expect(resultado).toEqual({ ok: true, data: filaPublica });
    expect(builder.eq).toHaveBeenCalledWith("slug", SLUG);
    expect(builder.eq).toHaveBeenCalledWith("estado_pago", true);
    expect(builder.is).toHaveBeenCalledWith("eliminado_en", null);
  });

  it("retorna NX-WEB-004 cuando el slug no existe", async () => {
    const builder = crearBuilderPublico({ data: null, error: null });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await obtenerClientePublicoPorSlug(supabase as never, "no-existe");

    expect(resultado).toEqual({ ok: false, error: "NX-WEB-004" });
  });

  it("retorna NX-WEB-004 (mismo código, sin distinguir el motivo) ante cualquier error de Supabase", async () => {
    const builder = crearBuilderPublico({ data: null, error: { message: "fallo" } });
    const supabase = { from: vi.fn(() => builder) };

    const resultado = await obtenerClientePublicoPorSlug(supabase as never, SLUG);

    expect(resultado).toEqual({ ok: false, error: "NX-WEB-004" });
  });
});
