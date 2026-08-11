import { beforeEach, describe, expect, it, vi } from "vitest";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

import { registrarPagoCuentaCorriente } from "./registrarPagoCuentaCorriente";
import { ESTADO_REGISTRAR_PAGO_CUENTA_CORRIENTE_INICIAL } from "./tipos";

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

function crearBuilderSolicitante(resultado: ResultadoSupabase) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    single: vi.fn(async () => resultado),
  };
  return builder;
}

function crearFormData(campos: Record<string, string>): FormData {
  const formData = new FormData();
  Object.entries(campos).forEach(([clave, valor]) => formData.set(clave, valor));
  return formData;
}

function mockearSesion(usuario: { id: string } | null) {
  return { auth: { getUser: vi.fn(async () => ({ data: { user: usuario } })) } };
}

function mockearSupabaseCompleto(opciones: { solicitante: ResultadoSupabase; rpc?: ReturnType<typeof vi.fn> }) {
  const solicitanteBuilder = crearBuilderSolicitante(opciones.solicitante);

  const from = vi.fn((tabla: string) => {
    if (tabla === "usuarios") return solicitanteBuilder;
    throw new Error(`tabla no mockeada en el test: ${tabla}`);
  });

  return { ...mockearSesion({ id: AUTH_USER_ID }), from, rpc: opciones.rpc ?? vi.fn() };
}

const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
const CLIENTE_ID = "a1111111-1111-4111-8111-111111111111";
const USUARIO_ID = "u-comerciante";
const CLIENTE_FINAL_ID = "c0f11111-1111-4111-8111-111111111111";

const DATOS_VALIDOS = { cliente_final_id: CLIENTE_FINAL_ID, monto: "400" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("registrarPagoCuentaCorriente", () => {
  it("rechaza un monto igual a cero con NX-FIA-004 sin consultar Supabase", async () => {
    const formData = crearFormData({ ...DATOS_VALIDOS, monto: "0" });

    const resultado = await registrarPagoCuentaCorriente(ESTADO_REGISTRAR_PAGO_CUENTA_CORRIENTE_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-FIA-004", exito: false });
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("rechaza un monto negativo con NX-FIA-004", async () => {
    const formData = crearFormData({ ...DATOS_VALIDOS, monto: "-10" });

    const resultado = await registrarPagoCuentaCorriente(ESTADO_REGISTRAR_PAGO_CUENTA_CORRIENTE_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-FIA-004", exito: false });
  });

  it("rechaza sin cliente_final_id con NX-SYS-006 (no es un error de monto)", async () => {
    const formData = crearFormData({ monto: "400" });

    const resultado = await registrarPagoCuentaCorriente(ESTADO_REGISTRAR_PAGO_CUENTA_CORRIENTE_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-006", exito: false });
  });

  it("rechaza sin sesión activa con NX-SYS-002", async () => {
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(mockearSesion(null) as never);

    const resultado = await registrarPagoCuentaCorriente(
      ESTADO_REGISTRAR_PAGO_CUENTA_CORRIENTE_INICIAL,
      crearFormData(DATOS_VALIDOS),
    );

    expect(resultado).toEqual({ error: "NX-SYS-002", exito: false });
  });

  it("rechaza por falta de permisos (NX-SYS-003) cuando el solicitante es admin_nodexa", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: "u-admin", rol: "admin_nodexa", cliente_id: null }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarPagoCuentaCorriente(
      ESTADO_REGISTRAR_PAGO_CUENTA_CORRIENTE_INICIAL,
      crearFormData(DATOS_VALIDOS),
    );

    expect(resultado).toEqual({ error: "NX-SYS-003", exito: false });
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("registra el pago (saldo 1000 -> 600 tras pagar 400), inserta el movimiento con venta_id NULL y audita", async () => {
    const movimiento = {
      movimiento_cc_id: "mcc-1",
      cliente_final_id: CLIENTE_FINAL_ID,
      venta_id: null,
      tipo: "pago",
      monto: 400,
      usuario_id: USUARIO_ID,
    };
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      rpc: vi.fn(async () => ({ data: movimiento, error: null })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarPagoCuentaCorriente(
      ESTADO_REGISTRAR_PAGO_CUENTA_CORRIENTE_INICIAL,
      crearFormData(DATOS_VALIDOS),
    );

    expect(resultado).toEqual({ error: null, exito: true });
    expect(supabaseMock.rpc).toHaveBeenCalledWith("fn_registrar_pago_cuenta_corriente", {
      p_cliente_final_id: CLIENTE_FINAL_ID,
      p_monto: 400,
    });
    expect(registrarDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: CLIENTE_ID,
        usuarioId: USUARIO_ID,
        tablaAfectada: "movimientos_cuenta_corriente",
        registroId: "mcc-1",
        campoModificado: "pago",
        valorAnterior: null,
        valorNuevo: "400",
      }),
    );
  });

  it("permite el pago a un empleado (docs/ROLES.md §2: C también para empleado, solo pagos)", async () => {
    const movimiento = {
      movimiento_cc_id: "mcc-2",
      cliente_final_id: CLIENTE_FINAL_ID,
      venta_id: null,
      tipo: "pago",
      monto: 400,
      usuario_id: "u-empleado",
    };
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: "u-empleado", rol: "empleado", cliente_id: CLIENTE_ID }, error: null },
      rpc: vi.fn(async () => ({ data: movimiento, error: null })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarPagoCuentaCorriente(
      ESTADO_REGISTRAR_PAGO_CUENTA_CORRIENTE_INICIAL,
      crearFormData(DATOS_VALIDOS),
    );

    expect(resultado).toEqual({ error: null, exito: true });
  });

  it("retorna NX-FIA-003 si el RPC rechaza por monto mayor al saldo deudor (SQLSTATE custom NX003), sin registrar auditoría", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      rpc: vi.fn(async () => ({
        data: null,
        error: { code: "NX003", message: "El monto del pago no puede ser mayor a la deuda actual del cliente." },
      })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarPagoCuentaCorriente(
      ESTADO_REGISTRAR_PAGO_CUENTA_CORRIENTE_INICIAL,
      crearFormData({ ...DATOS_VALIDOS, monto: "999999" }),
    );

    expect(resultado).toEqual({ error: "NX-FIA-003", exito: false });
    expect(registrarDiff).not.toHaveBeenCalled();
  });

  it("retorna NX-FIA-002 cuando el RPC no encuentra el cliente final en este comercio (SQLSTATE P0002)", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      rpc: vi.fn(async () => ({ data: null, error: { code: "P0002", message: "no encontrado" } })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarPagoCuentaCorriente(
      ESTADO_REGISTRAR_PAGO_CUENTA_CORRIENTE_INICIAL,
      crearFormData(DATOS_VALIDOS),
    );

    expect(resultado).toEqual({ error: "NX-FIA-002", exito: false });
  });

  it("retorna NX-SYS-001 ante cualquier otro error del RPC", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      rpc: vi.fn(async () => ({ data: null, error: { message: "fallo de conexión" } })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarPagoCuentaCorriente(
      ESTADO_REGISTRAR_PAGO_CUENTA_CORRIENTE_INICIAL,
      crearFormData(DATOS_VALIDOS),
    );

    expect(resultado).toEqual({ error: "NX-SYS-001", exito: false });
  });
});
