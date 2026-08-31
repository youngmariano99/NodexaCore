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

function mockearSupabaseCompleto(opciones: { solicitante: ResultadoSupabase; rpc?: ReturnType<typeof vi.fn>; clienteFinal?: unknown }) {

  const solicitanteBuilder = crearBuilderSolicitante(opciones.solicitante);
  const clienteFinalBuilder = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          is: vi.fn(() => ({
            maybeSingle: vi.fn(async () => opciones.clienteFinal ?? { data: { cliente_final_id: CLIENTE_FINAL_ID, cliente_id: CLIENTE_ID, saldo_deudor: 1000, nombre: "Juan" }, error: null }),
            single: vi.fn(async () => opciones.clienteFinal ?? { data: { cliente_final_id: CLIENTE_FINAL_ID, cliente_id: CLIENTE_ID, saldo_deudor: 1000, nombre: "Juan" }, error: null }),
          })),
        })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(async () => ({ error: null })),
    })),
  };
  const movCcBuilder = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          gt: vi.fn(() => ({
            order: vi.fn(async () => ({ data: [], error: null })),
          })),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({ data: { movimiento_cc_id: "mcc-pago-1" }, error: null })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(async () => ({ error: null })),
    })),
  };
  const imputacionesBuilder = {
    insert: vi.fn(async () => ({ error: null })),
  };

  const from = vi.fn((tabla: string) => {
    if (tabla === "usuarios") return solicitanteBuilder;
    if (tabla === "clientes_finales") return clienteFinalBuilder;
    if (tabla === "movimientos_cuenta_corriente") return movCcBuilder;
    if (tabla === "imputaciones_comprobantes") return imputacionesBuilder;
    throw new Error(`tabla no mockeada en el test: ${tabla}`);
  });

  return { ...mockearSesion({ id: AUTH_USER_ID }), from, rpc: opciones.rpc ?? vi.fn(), movCcBuilder };
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

  it("registra el pago (saldo 1000 -> 600 tras pagar 400), inserta el movimiento y audita", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarPagoCuentaCorriente(
      ESTADO_REGISTRAR_PAGO_CUENTA_CORRIENTE_INICIAL,
      crearFormData(DATOS_VALIDOS),
    );

    expect(resultado).toEqual({ error: null, exito: true });
    expect(supabaseMock.movCcBuilder.update).not.toHaveBeenCalled();
    expect(registrarDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: CLIENTE_ID,
        usuarioId: USUARIO_ID,
        tablaAfectada: "movimientos_cuenta_corriente",
        registroId: "mcc-pago-1",
        campoModificado: "pago",
      }),
    );
  });

  it("permite el pago a un empleado (docs/ROLES.md §2: C también para empleado, solo pagos)", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: "u-empleado", rol: "empleado", cliente_id: CLIENTE_ID }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarPagoCuentaCorriente(
      ESTADO_REGISTRAR_PAGO_CUENTA_CORRIENTE_INICIAL,
      crearFormData(DATOS_VALIDOS),
    );

    expect(resultado).toEqual({ error: null, exito: true });
  });

  it("retorna NX-FIA-003 si el monto ingresado supera el saldo deudor actual, sin registrar auditoría", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      clienteFinal: { data: { cliente_final_id: CLIENTE_FINAL_ID, cliente_id: CLIENTE_ID, saldo_deudor: 500, nombre: "Juan" }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarPagoCuentaCorriente(
      ESTADO_REGISTRAR_PAGO_CUENTA_CORRIENTE_INICIAL,
      crearFormData({ ...DATOS_VALIDOS, monto: "999999" }),
    );

    expect(resultado).toEqual({ error: "NX-FIA-003", exito: false });
    expect(registrarDiff).not.toHaveBeenCalled();
  });

  it("retorna NX-FIA-002 cuando no encuentra el cliente final en este comercio", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      clienteFinal: { data: null, error: { message: "No encontrado" } },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarPagoCuentaCorriente(
      ESTADO_REGISTRAR_PAGO_CUENTA_CORRIENTE_INICIAL,
      crearFormData(DATOS_VALIDOS),
    );

    expect(resultado).toEqual({ error: "NX-FIA-002", exito: false });
  });
});

