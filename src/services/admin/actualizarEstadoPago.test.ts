import { beforeEach, describe, expect, it, vi } from "vitest";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

import { actualizarEstadoPago } from "./actualizarEstadoPago";

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

function mockearSesion(usuario: { id: string } | null) {
  return { auth: { getUser: vi.fn(async () => ({ data: { user: usuario } })) } };
}

const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
const USUARIO_ID_ADMIN = "d0000000-0000-4000-8000-000000000001";
const CLIENTE_ID = "b2222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("actualizarEstadoPago", () => {
  it("rechaza un cliente_id que no es UUID con NX-SYS-006 sin consultar Supabase", async () => {
    const resultado = await actualizarEstadoPago("no-es-un-uuid", false);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-006" });
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("rechaza sin sesión activa con NX-SYS-002", async () => {
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(mockearSesion(null) as never);

    const resultado = await actualizarEstadoPago(CLIENTE_ID, false);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-002" });
  });

  it("rechaza por falta de permisos (NX-SYS-003) cuando el solicitante no es admin_nodexa", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: "u-comerciante", rol: "comerciante" },
      error: null,
    });
    const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: vi.fn(() => solicitanteBuilder) };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await actualizarEstadoPago(CLIENTE_ID, false);

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

    const resultado = await actualizarEstadoPago(CLIENTE_ID, false);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-004" });
  });

  it("suspende el comercio (true → false), audita el cambio y arma la notificación de suspensión", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: USUARIO_ID_ADMIN, rol: "admin_nodexa" },
      error: null,
    });
    const clienteBuilder = crearBuilderSingle({
      data: {
        nombre_comercio: "Ferretería El Tornillo",
        telefono_whatsapp: "+5492920000002",
        estado_pago: true,
      },
      error: null,
    });
    const actualizacionBuilder = crearBuilderSingle({ data: { estado_pago: false }, error: null });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi
        .fn()
        .mockReturnValueOnce(solicitanteBuilder)
        .mockReturnValueOnce(clienteBuilder)
        .mockReturnValueOnce(actualizacionBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await actualizarEstadoPago(CLIENTE_ID, false);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error("esperado ok=true");
    expect(resultado.data.estadoPago).toBe(false);
    expect(resultado.data.notificacion.mensaje).toContain("suspendida por falta de pago");
    expect(resultado.data.notificacion.enlaceWhatsapp).toContain("https://wa.me/+5492920000002");

    expect(actualizacionBuilder.update).toHaveBeenCalledWith({ estado_pago: false });

    expect(registrarDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: CLIENTE_ID,
        usuarioId: USUARIO_ID_ADMIN,
        tablaAfectada: "clientes",
        registroId: CLIENTE_ID,
        campoModificado: "estado_pago",
        valorAnterior: "true",
        valorNuevo: "false",
      }),
    );
  });

  it("reactiva el comercio (false → true) y arma la notificación de reactivación", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: USUARIO_ID_ADMIN, rol: "admin_nodexa" },
      error: null,
    });
    const clienteBuilder = crearBuilderSingle({
      data: {
        nombre_comercio: "Ferretería El Tornillo",
        telefono_whatsapp: "+5492920000002",
        estado_pago: false,
      },
      error: null,
    });
    const actualizacionBuilder = crearBuilderSingle({ data: { estado_pago: true }, error: null });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi
        .fn()
        .mockReturnValueOnce(solicitanteBuilder)
        .mockReturnValueOnce(clienteBuilder)
        .mockReturnValueOnce(actualizacionBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await actualizarEstadoPago(CLIENTE_ID, true);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error("esperado ok=true");
    expect(resultado.data.estadoPago).toBe(true);
    expect(resultado.data.notificacion.mensaje).toContain("reactivada");

    expect(registrarDiff).toHaveBeenCalledWith(
      expect.objectContaining({ campoModificado: "estado_pago", valorAnterior: "false", valorNuevo: "true" }),
    );
  });

  it("retorna NX-SYS-001 ante un fallo real del UPDATE", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: USUARIO_ID_ADMIN, rol: "admin_nodexa" },
      error: null,
    });
    const clienteBuilder = crearBuilderSingle({
      data: {
        nombre_comercio: "Ferretería El Tornillo",
        telefono_whatsapp: "+5492920000002",
        estado_pago: true,
      },
      error: null,
    });
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

    const resultado = await actualizarEstadoPago(CLIENTE_ID, false);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-001" });
    expect(registrarDiff).not.toHaveBeenCalled();
  });
});
