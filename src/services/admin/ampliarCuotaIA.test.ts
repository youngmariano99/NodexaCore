import { beforeEach, describe, expect, it, vi } from "vitest";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

import { ampliarCuotaIA } from "./ampliarCuotaIA";

vi.mock("@/lib/supabase/server", () => ({
  crearClienteSupabaseServidor: vi.fn(),
}));

vi.mock("@/lib/auditoria/registrarDiff", () => ({
  registrarDiff: vi.fn(),
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

function crearBuilderInsert(resultado: ResultadoSupabase) {
  const builder = {
    insert: vi.fn(() => builder),
    select: vi.fn(() => builder),
    single: vi.fn(async () => resultado),
  };
  return builder;
}

function mockearSesion(usuario: { id: string } | null) {
  return { auth: { getUser: vi.fn(async () => ({ data: { user: usuario } })) } };
}

const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
const USUARIO_ID_ADMIN = "d0000000-0000-4000-8000-000000000001";
const CLIENTE_ID = "b2222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ampliarCuotaIA", () => {
  it("rechaza un cliente_id que no es UUID con NX-SYS-006 sin consultar Supabase", async () => {
    const resultado = await ampliarCuotaIA("no-es-un-uuid");

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-006" });
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("rechaza sin sesión activa con NX-SYS-002", async () => {
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(mockearSesion(null) as never);

    const resultado = await ampliarCuotaIA(CLIENTE_ID);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-002" });
  });

  it("rechaza por falta de permisos (NX-SYS-003) cuando el solicitante no es admin_nodexa", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: "u-comerciante", rol: "comerciante" },
      error: null,
    });
    const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: vi.fn(() => solicitanteBuilder) };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await ampliarCuotaIA(CLIENTE_ID);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-003" });
    expect(solicitanteBuilder.update).not.toHaveBeenCalled();
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

    const resultado = await ampliarCuotaIA(CLIENTE_ID);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-004" });
  });

  it("suma +40 a cuota_mensual_ia, audita el cambio y factura $3.000 fijos", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: USUARIO_ID_ADMIN, rol: "admin_nodexa" },
      error: null,
    });
    const clienteBuilder = crearBuilderSingle({ data: { cuota_mensual_ia: 40 }, error: null });
    const actualizacionBuilder = crearBuilderSingle({ data: { cuota_mensual_ia: 80 }, error: null });
    const ajusteBuilder = crearBuilderInsert({
      data: {
        ajuste_facturacion_id: "e3333333-3333-4333-8333-333333333333",
        cliente_id: CLIENTE_ID,
        concepto: "recarga_ia",
        monto: 3000,
        periodo_facturado: "2026-09-01",
      },
      error: null,
    });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi
        .fn()
        .mockReturnValueOnce(solicitanteBuilder)
        .mockReturnValueOnce(clienteBuilder)
        .mockReturnValueOnce(actualizacionBuilder)
        .mockReturnValueOnce(ajusteBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await ampliarCuotaIA(CLIENTE_ID);

    expect(resultado).toEqual({
      ok: true,
      data: { cuotaMensualIa: 80, ajusteFacturacion: { monto: 3000, periodoFacturado: "2026-09-01" } },
    });

    expect(actualizacionBuilder.update).toHaveBeenCalledWith({ cuota_mensual_ia: 80 });
    expect(ajusteBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({ concepto: "recarga_ia", monto: 3000 }));

    expect(registrarDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: CLIENTE_ID,
        usuarioId: USUARIO_ID_ADMIN,
        tablaAfectada: "clientes",
        campoModificado: "cuota_mensual_ia",
        valorAnterior: "40",
        valorNuevo: "80",
      }),
    );
  });

  it("una segunda recarga sigue costando $3.000 (sin esquema escalonado)", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: USUARIO_ID_ADMIN, rol: "admin_nodexa" },
      error: null,
    });
    const clienteBuilder = crearBuilderSingle({ data: { cuota_mensual_ia: 80 }, error: null });
    const actualizacionBuilder = crearBuilderSingle({ data: { cuota_mensual_ia: 120 }, error: null });
    const ajusteBuilder = crearBuilderInsert({
      data: {
        ajuste_facturacion_id: "e4444444-4444-4444-8444-444444444444",
        cliente_id: CLIENTE_ID,
        concepto: "recarga_ia",
        monto: 3000,
        periodo_facturado: "2026-09-01",
      },
      error: null,
    });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi
        .fn()
        .mockReturnValueOnce(solicitanteBuilder)
        .mockReturnValueOnce(clienteBuilder)
        .mockReturnValueOnce(actualizacionBuilder)
        .mockReturnValueOnce(ajusteBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await ampliarCuotaIA(CLIENTE_ID);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error("esperado ok=true");
    expect(resultado.data.ajusteFacturacion.monto).toBe(3000);
  });

  it("retorna NX-SYS-001 ante un fallo real del UPDATE", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: USUARIO_ID_ADMIN, rol: "admin_nodexa" },
      error: null,
    });
    const clienteBuilder = crearBuilderSingle({ data: { cuota_mensual_ia: 40 }, error: null });
    const actualizacionBuilder = crearBuilderSingle({ data: null, error: { message: "fallo de conexión" } });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi
        .fn()
        .mockReturnValueOnce(solicitanteBuilder)
        .mockReturnValueOnce(clienteBuilder)
        .mockReturnValueOnce(actualizacionBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await ampliarCuotaIA(CLIENTE_ID);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-001" });
    expect(registrarDiff).not.toHaveBeenCalled();
  });

  it("propaga el error si falla el registro del ajuste de facturación", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: USUARIO_ID_ADMIN, rol: "admin_nodexa" },
      error: null,
    });
    const clienteBuilder = crearBuilderSingle({ data: { cuota_mensual_ia: 40 }, error: null });
    const actualizacionBuilder = crearBuilderSingle({ data: { cuota_mensual_ia: 80 }, error: null });
    const ajusteBuilder = crearBuilderInsert({ data: null, error: { message: "fallo de conexión" } });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi
        .fn()
        .mockReturnValueOnce(solicitanteBuilder)
        .mockReturnValueOnce(clienteBuilder)
        .mockReturnValueOnce(actualizacionBuilder)
        .mockReturnValueOnce(ajusteBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await ampliarCuotaIA(CLIENTE_ID);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-001" });
  });
});
