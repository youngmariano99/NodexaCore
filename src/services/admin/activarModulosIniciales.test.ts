import { beforeEach, describe, expect, it, vi } from "vitest";

import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { registrarDiffAuditoria } from "@/repositories/auditoria";

import { activarModulosIniciales } from "./activarModulosIniciales";

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

function crearBuilderSolicitante(resultado: ResultadoSupabase) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    single: vi.fn(async () => resultado),
  };
  return builder;
}

function crearBuilderUpsert(resultado: ResultadoSupabase) {
  const builder = {
    upsert: vi.fn(() => builder),
    select: vi.fn(() => builder),
    returns: vi.fn(async () => resultado),
  };
  return builder;
}

function mockearSesion(usuario: { id: string } | null) {
  return { auth: { getUser: vi.fn(async () => ({ data: { user: usuario } })) } };
}

const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
const USUARIO_ID_ADMIN = "d0000000-0000-4000-8000-000000000001";
const CLIENTE_ID = "a1111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("activarModulosIniciales", () => {
  it("rechaza un arreglo de módulos vacío con NX-SYS-006 sin consultar Supabase", async () => {
    const resultado = await activarModulosIniciales(CLIENTE_ID, []);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-006" });
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("rechaza un cliente_id que no es UUID con NX-SYS-006 sin consultar Supabase", async () => {
    const resultado = await activarModulosIniciales("no-es-un-uuid", ["fiados"]);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-006" });
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("rechaza sin sesión activa con NX-SYS-002", async () => {
    const supabaseMock = mockearSesion(null);
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await activarModulosIniciales(CLIENTE_ID, ["fiados"]);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-002" });
  });

  it("rechaza por falta de permisos (NX-SYS-003) cuando el solicitante no es admin_nodexa", async () => {
    const solicitanteBuilder = crearBuilderSolicitante({
      data: { usuario_id: "u-comerciante", rol: "comerciante" },
      error: null,
    });
    const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: vi.fn(() => solicitanteBuilder) };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await activarModulosIniciales(CLIENTE_ID, ["fiados"]);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-003" });
  });

  it("activa los módulos solicitados y registra la auditoría de forma asíncrona", async () => {
    const solicitanteBuilder = crearBuilderSolicitante({
      data: { usuario_id: USUARIO_ID_ADMIN, rol: "admin_nodexa" },
      error: null,
    });
    const upsertBuilder = crearBuilderUpsert({
      data: [{ modulo: "fiados" }, { modulo: "catalogo_web" }],
      error: null,
    });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn().mockReturnValueOnce(solicitanteBuilder).mockReturnValueOnce(upsertBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await activarModulosIniciales(CLIENTE_ID, ["fiados", "catalogo_web"]);

    expect(resultado).toEqual({ ok: true, data: { modulosActivados: ["fiados", "catalogo_web"] } });

    expect(upsertBuilder.upsert).toHaveBeenCalledWith(
      [
        { cliente_id: CLIENTE_ID, modulo: "fiados", activo: true },
        { cliente_id: CLIENTE_ID, modulo: "catalogo_web", activo: true },
      ],
      { onConflict: "cliente_id,modulo", ignoreDuplicates: true },
    );

    expect(registrarDiffAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: CLIENTE_ID,
        usuarioId: USUARIO_ID_ADMIN,
        tablaAfectada: "tenant_modules",
        campoModificado: "activacion_inicial",
      }),
    );
  });

  it("no rompe la operación cuando un módulo ya estaba activado (UNIQUE cliente_id+modulo)", async () => {
    const solicitanteBuilder = crearBuilderSolicitante({
      data: { usuario_id: USUARIO_ID_ADMIN, rol: "admin_nodexa" },
      error: null,
    });
    // ignoreDuplicates hace que Postgres no devuelva fila para el conflicto: se resuelve con array vacío, sin error.
    const upsertBuilder = crearBuilderUpsert({ data: [], error: null });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn().mockReturnValueOnce(solicitanteBuilder).mockReturnValueOnce(upsertBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await activarModulosIniciales(CLIENTE_ID, ["fiados"]);

    expect(resultado).toEqual({ ok: true, data: { modulosActivados: [] } });
  });

  it("deduplica módulos repetidos en el arreglo de entrada antes de insertar", async () => {
    const solicitanteBuilder = crearBuilderSolicitante({
      data: { usuario_id: USUARIO_ID_ADMIN, rol: "admin_nodexa" },
      error: null,
    });
    const upsertBuilder = crearBuilderUpsert({ data: [{ modulo: "fiados" }], error: null });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn().mockReturnValueOnce(solicitanteBuilder).mockReturnValueOnce(upsertBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    await activarModulosIniciales(CLIENTE_ID, ["fiados", "fiados"]);

    expect(upsertBuilder.upsert).toHaveBeenCalledWith(
      [{ cliente_id: CLIENTE_ID, modulo: "fiados", activo: true }],
      { onConflict: "cliente_id,modulo", ignoreDuplicates: true },
    );
  });
});
