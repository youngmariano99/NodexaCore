import { beforeEach, describe, expect, it, vi } from "vitest";

import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { registrarDiffAuditoria } from "@/repositories/auditoria";

import { ampliarLimiteSku } from "./ampliarLimiteSku";

vi.mock("next/server", () => ({
  after: vi.fn((callback: () => unknown) => callback()),
}));

vi.mock("@/lib/supabase/server", () => ({
  crearClienteSupabaseServidor: vi.fn(),
  crearClienteSupabaseAdmin: vi.fn(),
}));

vi.mock("@/repositories/auditoria", () => ({
  registrarDiffAuditoria: vi.fn(async () => undefined),
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
    single: vi.fn(async () => resultado),
  };
  return builder;
}

function crearBuilderConteo(resultado: { count: number | null; error: unknown }) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(async () => resultado),
  };
  return builder;
}

function mockearSesion(usuario: { id: string } | null) {
  return { auth: { getUser: vi.fn(async () => ({ data: { user: usuario } })) } };
}

const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
const USUARIO_ID_ADMIN = "d0000000-0000-4000-8000-000000000001";
const CLIENTE_ID = "c3333333-3333-4333-8333-333333333333";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ampliarLimiteSku", () => {
  it("rechaza un nuevo límite no positivo con NX-SYS-006 sin consultar Supabase", async () => {
    const resultado = await ampliarLimiteSku(CLIENTE_ID, 0);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-006" });
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("rechaza un cliente_id que no es UUID con NX-SYS-006 sin consultar Supabase", async () => {
    const resultado = await ampliarLimiteSku("no-es-un-uuid", 2000);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-006" });
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("rechaza sin sesión activa con NX-SYS-002", async () => {
    const supabaseMock = mockearSesion(null);
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await ampliarLimiteSku(CLIENTE_ID, 2000);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-002" });
  });

  it("rechaza por falta de permisos (NX-SYS-003) cuando el solicitante no es admin_nodexa", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: "u-comerciante", rol: "comerciante" },
      error: null,
    });
    const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: vi.fn(() => solicitanteBuilder) };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await ampliarLimiteSku(CLIENTE_ID, 2000);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-003" });
  });

  it("retorna NX-SYS-004 cuando el cliente no existe", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: USUARIO_ID_ADMIN, rol: "admin_nodexa" },
      error: null,
    });
    const clienteBuilder = crearBuilderSingle({ data: null, error: { message: "no encontrado" } });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn().mockReturnValueOnce(solicitanteBuilder).mockReturnValueOnce(clienteBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await ampliarLimiteSku(CLIENTE_ID, 2000);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-004" });
  });

  it("retorna NX-ADM-003 al intentar bajar el límite por debajo del conteo actual de SKU activos", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: USUARIO_ID_ADMIN, rol: "admin_nodexa" },
      error: null,
    });
    const clienteBuilder = crearBuilderSingle({
      data: { limite_sku: 1000, packs_sku_contratados: 0 },
      error: null,
    });
    const conteoBuilder = crearBuilderConteo({ count: 910, error: null });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi
        .fn()
        .mockReturnValueOnce(solicitanteBuilder)
        .mockReturnValueOnce(clienteBuilder)
        .mockReturnValueOnce(conteoBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await ampliarLimiteSku(CLIENTE_ID, 500);

    expect(resultado).toEqual({ ok: false, error: "NX-ADM-003" });
  });

  it("amplía el límite de 1000 a 2000, suma 1 pack y registra la auditoría", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: USUARIO_ID_ADMIN, rol: "admin_nodexa" },
      error: null,
    });
    const clienteBuilder = crearBuilderSingle({
      data: { limite_sku: 1000, packs_sku_contratados: 0 },
      error: null,
    });
    const conteoBuilder = crearBuilderConteo({ count: 1000, error: null });
    const actualizacionBuilder = crearBuilderSingle({
      data: { limite_sku: 2000, packs_sku_contratados: 1 },
      error: null,
    });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi
        .fn()
        .mockReturnValueOnce(solicitanteBuilder)
        .mockReturnValueOnce(clienteBuilder)
        .mockReturnValueOnce(conteoBuilder)
        .mockReturnValueOnce(actualizacionBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await ampliarLimiteSku(CLIENTE_ID, 2000);

    expect(resultado).toEqual({
      ok: true,
      data: { limiteSku: 2000, packsSkuContratados: 1, packsAgregados: 1 },
    });

    expect(actualizacionBuilder.update).toHaveBeenCalledWith({ limite_sku: 2000, packs_sku_contratados: 1 });

    expect(registrarDiffAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: CLIENTE_ID,
        usuarioId: USUARIO_ID_ADMIN,
        tablaAfectada: "clientes",
        campoModificado: "limite_sku",
        valorAnterior: "1000",
        valorNuevo: "2000",
      }),
    );
  });

  it("no suma packs ni cambia el contador cuando el nuevo límite no supera al anterior", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: USUARIO_ID_ADMIN, rol: "admin_nodexa" },
      error: null,
    });
    const clienteBuilder = crearBuilderSingle({
      data: { limite_sku: 2000, packs_sku_contratados: 1 },
      error: null,
    });
    const conteoBuilder = crearBuilderConteo({ count: 1000, error: null });
    const actualizacionBuilder = crearBuilderSingle({
      data: { limite_sku: 1500, packs_sku_contratados: 1 },
      error: null,
    });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi
        .fn()
        .mockReturnValueOnce(solicitanteBuilder)
        .mockReturnValueOnce(clienteBuilder)
        .mockReturnValueOnce(conteoBuilder)
        .mockReturnValueOnce(actualizacionBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await ampliarLimiteSku(CLIENTE_ID, 1500);

    expect(resultado).toEqual({
      ok: true,
      data: { limiteSku: 1500, packsSkuContratados: 1, packsAgregados: 0 },
    });
    expect(actualizacionBuilder.update).toHaveBeenCalledWith({ limite_sku: 1500, packs_sku_contratados: 1 });
  });
});
