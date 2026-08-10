import { beforeEach, describe, expect, it, vi } from "vitest";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

import { eliminarProducto } from "./eliminarProducto";
import { ESTADO_ELIMINAR_PRODUCTO_INICIAL } from "./tipos";

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

const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
const CLIENTE_ID = "a1111111-1111-4111-8111-111111111111";
const USUARIO_ID = "u-comerciante";
const PRODUCTO_ID = "p-1";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("eliminarProducto", () => {
  it("rechaza sin sesión activa con NX-SYS-002", async () => {
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(mockearSesion(null) as never);

    const resultado = await eliminarProducto(PRODUCTO_ID, ESTADO_ELIMINAR_PRODUCTO_INICIAL, new FormData());

    expect(resultado).toEqual({ error: "NX-SYS-002", exito: false });
  });

  it("rechaza por falta de permisos (NX-SYS-003) cuando el solicitante es empleado", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: USUARIO_ID, rol: "empleado", cliente_id: CLIENTE_ID },
      error: null,
    });
    const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: vi.fn(() => solicitanteBuilder) };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await eliminarProducto(PRODUCTO_ID, ESTADO_ELIMINAR_PRODUCTO_INICIAL, new FormData());

    expect(resultado).toEqual({ error: "NX-SYS-003", exito: false });
  });

  it("retorna NX-SYS-007 sin aplicar cambios cuando el producto pertenece a otro cliente_id", async () => {
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

    const resultado = await eliminarProducto(PRODUCTO_ID, ESTADO_ELIMINAR_PRODUCTO_INICIAL, new FormData());

    expect(resultado).toEqual({ error: "NX-SYS-007", exito: false });
  });

  it("retorna NX-PRD-006 sin reescribir eliminado_en cuando el producto ya estaba dado de baja", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID },
      error: null,
    });
    const guardBuilder = crearBuilderSingle({ data: { producto_id: PRODUCTO_ID }, error: null });
    const estadoActualBuilder = crearBuilderSingle({
      data: { eliminado_en: "2026-08-01T00:00:00.000Z" },
      error: null,
    });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi
        .fn()
        .mockReturnValueOnce(solicitanteBuilder)
        .mockReturnValueOnce(guardBuilder)
        .mockReturnValueOnce(estadoActualBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await eliminarProducto(PRODUCTO_ID, ESTADO_ELIMINAR_PRODUCTO_INICIAL, new FormData());

    expect(resultado).toEqual({ error: "NX-PRD-006", exito: false });
    expect(registrarDiff).not.toHaveBeenCalled();
  });

  it("da de baja el producto activo (UPDATE, nunca DELETE) y registra el diff de eliminado_en", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID },
      error: null,
    });
    const guardBuilder = crearBuilderSingle({ data: { producto_id: PRODUCTO_ID }, error: null });
    const estadoActualBuilder = crearBuilderSingle({ data: { eliminado_en: null }, error: null });
    const bajaBuilder = crearBuilderSingle({
      data: { producto_id: PRODUCTO_ID, eliminado_en: "2026-08-10T12:00:00.000Z" },
      error: null,
    });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi
        .fn()
        .mockReturnValueOnce(solicitanteBuilder)
        .mockReturnValueOnce(guardBuilder)
        .mockReturnValueOnce(estadoActualBuilder)
        .mockReturnValueOnce(bajaBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await eliminarProducto(PRODUCTO_ID, ESTADO_ELIMINAR_PRODUCTO_INICIAL, new FormData());

    expect(resultado).toEqual({ error: null, exito: true });
    expect(bajaBuilder.update).toHaveBeenCalledWith({ eliminado_en: expect.any(String) });

    expect(registrarDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: CLIENTE_ID,
        usuarioId: USUARIO_ID,
        tablaAfectada: "productos",
        registroId: PRODUCTO_ID,
        campoModificado: "eliminado_en",
        valorAnterior: null,
        valorNuevo: "2026-08-10T12:00:00.000Z",
      }),
    );
  });
});
