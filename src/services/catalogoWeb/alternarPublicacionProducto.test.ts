import { beforeEach, describe, expect, it, vi } from "vitest";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

import { alternarPublicacionProducto } from "./alternarPublicacionProducto";
import { ESTADO_ALTERNAR_PUBLICACION_PRODUCTO_INICIAL } from "./tipos";

vi.mock("@/lib/supabase/server", () => ({
  crearClienteSupabaseServidor: vi.fn(),
}));

vi.mock("@/lib/auditoria/registrarDiff", () => ({
  registrarDiff: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
}));

interface ResultadoSupabase {
  data: unknown;
  error: unknown;
}

function crearBuilderSingle(resultado: ResultadoSupabase) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    update: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => resultado),
    single: vi.fn(async () => resultado),
  };
  return builder;
}

function mockearSesion(usuario: { id: string } | null) {
  return { auth: { getUser: vi.fn(async () => ({ data: { user: usuario } })) } };
}

function crearFormData(publicado: "true" | "false"): FormData {
  const formData = new FormData();
  formData.set("publicado", publicado);
  return formData;
}

const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
const CLIENTE_ID = "a1111111-1111-4111-8111-111111111111";
const USUARIO_ID = "u-comerciante";
const PRODUCTO_ID = "p-1";

const PRODUCTO_COMPLETO = {
  nombre: "Yerba Mate 1kg",
  precio: 3500,
  imagen_url: "https://cdn.nodexa.app/productos/yerba.webp",
  publicado: false,
  eliminado_en: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("alternarPublicacionProducto", () => {
  it("rechaza con NX-SYS-006 sin consultar Supabase si publicado no es 'true'/'false'", async () => {
    const formData = new FormData();
    formData.set("publicado", "si");

    const resultado = await alternarPublicacionProducto(PRODUCTO_ID, ESTADO_ALTERNAR_PUBLICACION_PRODUCTO_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-006", exito: false });
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("rechaza sin sesión activa con NX-SYS-002", async () => {
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(mockearSesion(null) as never);

    const resultado = await alternarPublicacionProducto(
      PRODUCTO_ID,
      ESTADO_ALTERNAR_PUBLICACION_PRODUCTO_INICIAL,
      crearFormData("true"),
    );

    expect(resultado).toEqual({ error: "NX-SYS-002", exito: false });
  });

  it("rechaza por falta de permisos (NX-SYS-003) cuando el solicitante es empleado (exclusivo de comerciante)", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: USUARIO_ID, rol: "empleado", cliente_id: CLIENTE_ID },
      error: null,
    });
    const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: vi.fn(() => solicitanteBuilder) };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await alternarPublicacionProducto(
      PRODUCTO_ID,
      ESTADO_ALTERNAR_PUBLICACION_PRODUCTO_INICIAL,
      crearFormData("true"),
    );

    expect(resultado).toEqual({ error: "NX-SYS-003", exito: false });
  });

  it("retorna NX-SYS-007 sin aplicar cambios cuando el producto pertenece a otro tenant", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID },
      error: null,
    });
    const guardBuilder = crearBuilderSingle({ data: null, error: null });
    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn().mockReturnValueOnce(solicitanteBuilder).mockReturnValueOnce(guardBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await alternarPublicacionProducto(
      PRODUCTO_ID,
      ESTADO_ALTERNAR_PUBLICACION_PRODUCTO_INICIAL,
      crearFormData("true"),
    );

    expect(resultado).toEqual({ error: "NX-SYS-007", exito: false });
  });

  it("retorna NX-PRD-006 sin tocar el flag cuando el producto ya fue dado de baja", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID },
      error: null,
    });
    const guardBuilder = crearBuilderSingle({ data: { producto_id: PRODUCTO_ID }, error: null });
    const productoBuilder = crearBuilderSingle({
      data: { ...PRODUCTO_COMPLETO, eliminado_en: "2026-08-01T00:00:00.000Z" },
      error: null,
    });
    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn().mockReturnValueOnce(solicitanteBuilder).mockReturnValueOnce(guardBuilder).mockReturnValueOnce(productoBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await alternarPublicacionProducto(
      PRODUCTO_ID,
      ESTADO_ALTERNAR_PUBLICACION_PRODUCTO_INICIAL,
      crearFormData("true"),
    );

    expect(resultado).toEqual({ error: "NX-PRD-006", exito: false });
    expect(registrarDiff).not.toHaveBeenCalled();
  });

  it("retorna NX-WEB-001 al intentar publicar si el módulo catalogo_web no está activo", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID },
      error: null,
    });
    const guardBuilder = crearBuilderSingle({ data: { producto_id: PRODUCTO_ID }, error: null });
    const productoBuilder = crearBuilderSingle({ data: PRODUCTO_COMPLETO, error: null });
    const moduloBuilder = crearBuilderSingle({ data: { activo: false }, error: null });
    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi
        .fn()
        .mockReturnValueOnce(solicitanteBuilder)
        .mockReturnValueOnce(guardBuilder)
        .mockReturnValueOnce(productoBuilder)
        .mockReturnValueOnce(moduloBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await alternarPublicacionProducto(
      PRODUCTO_ID,
      ESTADO_ALTERNAR_PUBLICACION_PRODUCTO_INICIAL,
      crearFormData("true"),
    );

    expect(resultado).toEqual({ error: "NX-WEB-001", exito: false });
  });

  it("retorna NX-WEB-001 al intentar publicar si el tenant nunca contrató el módulo (sin fila en tenant_modules)", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID },
      error: null,
    });
    const guardBuilder = crearBuilderSingle({ data: { producto_id: PRODUCTO_ID }, error: null });
    const productoBuilder = crearBuilderSingle({ data: PRODUCTO_COMPLETO, error: null });
    const moduloBuilder = crearBuilderSingle({ data: null, error: null });
    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi
        .fn()
        .mockReturnValueOnce(solicitanteBuilder)
        .mockReturnValueOnce(guardBuilder)
        .mockReturnValueOnce(productoBuilder)
        .mockReturnValueOnce(moduloBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await alternarPublicacionProducto(
      PRODUCTO_ID,
      ESTADO_ALTERNAR_PUBLICACION_PRODUCTO_INICIAL,
      crearFormData("true"),
    );

    expect(resultado).toEqual({ error: "NX-WEB-001", exito: false });
  });

  it.each([
    ["sin nombre", { ...PRODUCTO_COMPLETO, nombre: "  " }],
    ["con precio en cero", { ...PRODUCTO_COMPLETO, precio: 0 }],
    ["sin imagen", { ...PRODUCTO_COMPLETO, imagen_url: null }],
  ])("retorna NX-WEB-002 al intentar publicar un producto %s", async (_descripcion, productoIncompleto) => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID },
      error: null,
    });
    const guardBuilder = crearBuilderSingle({ data: { producto_id: PRODUCTO_ID }, error: null });
    const productoBuilder = crearBuilderSingle({ data: productoIncompleto, error: null });
    const moduloBuilder = crearBuilderSingle({ data: { activo: true }, error: null });
    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi
        .fn()
        .mockReturnValueOnce(solicitanteBuilder)
        .mockReturnValueOnce(guardBuilder)
        .mockReturnValueOnce(productoBuilder)
        .mockReturnValueOnce(moduloBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await alternarPublicacionProducto(
      PRODUCTO_ID,
      ESTADO_ALTERNAR_PUBLICACION_PRODUCTO_INICIAL,
      crearFormData("true"),
    );

    expect(resultado).toEqual({ error: "NX-WEB-002", exito: false });
  });

  it("publica un producto completo con el módulo activo: cambia publicado a true y registra el diff", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID },
      error: null,
    });
    const guardBuilder = crearBuilderSingle({ data: { producto_id: PRODUCTO_ID }, error: null });
    const productoBuilder = crearBuilderSingle({ data: PRODUCTO_COMPLETO, error: null });
    const moduloBuilder = crearBuilderSingle({ data: { activo: true }, error: null });
    const updateBuilder = crearBuilderSingle({ data: null, error: null });
    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi
        .fn()
        .mockReturnValueOnce(solicitanteBuilder)
        .mockReturnValueOnce(guardBuilder)
        .mockReturnValueOnce(productoBuilder)
        .mockReturnValueOnce(moduloBuilder)
        .mockReturnValueOnce(updateBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await alternarPublicacionProducto(
      PRODUCTO_ID,
      ESTADO_ALTERNAR_PUBLICACION_PRODUCTO_INICIAL,
      crearFormData("true"),
    );

    expect(resultado).toEqual({ error: null, exito: true });
    expect(updateBuilder.update).toHaveBeenCalledWith({ publicado: true, actualizado_en: expect.any(String) });
    expect(registrarDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: CLIENTE_ID,
        usuarioId: USUARIO_ID,
        tablaAfectada: "productos",
        registroId: PRODUCTO_ID,
        campoModificado: "publicado",
        valorAnterior: "false",
        valorNuevo: "true",
      }),
    );
  });

  it("despublica sin exigir módulo activo ni campos completos (nunca bloquea sacar un producto de la vidriera)", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID },
      error: null,
    });
    const guardBuilder = crearBuilderSingle({ data: { producto_id: PRODUCTO_ID }, error: null });
    const productoBuilder = crearBuilderSingle({
      data: { ...PRODUCTO_COMPLETO, imagen_url: null, publicado: true },
      error: null,
    });
    const updateBuilder = crearBuilderSingle({ data: null, error: null });
    const fromMock = vi
      .fn()
      .mockReturnValueOnce(solicitanteBuilder)
      .mockReturnValueOnce(guardBuilder)
      .mockReturnValueOnce(productoBuilder)
      .mockReturnValueOnce(updateBuilder);
    const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: fromMock };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await alternarPublicacionProducto(
      PRODUCTO_ID,
      ESTADO_ALTERNAR_PUBLICACION_PRODUCTO_INICIAL,
      crearFormData("false"),
    );

    expect(resultado).toEqual({ error: null, exito: true });
    expect(updateBuilder.update).toHaveBeenCalledWith({ publicado: false, actualizado_en: expect.any(String) });
    expect(fromMock).toHaveBeenCalledTimes(4);
  });
});
