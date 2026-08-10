import { beforeEach, describe, expect, it, vi } from "vitest";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

import { registrarEntradaStock } from "./registrarEntradaStock";
import { ESTADO_REGISTRAR_ENTRADA_STOCK_INICIAL } from "./tipos";

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

const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
const CLIENTE_ID = "a1111111-1111-4111-8111-111111111111";
const USUARIO_ID = "u-comerciante";
const PRODUCTO_ID = "b1111111-1111-4111-8111-111111111111";

const DATOS_VALIDOS = { producto_id: PRODUCTO_ID, cantidad: "20" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("registrarEntradaStock", () => {
  it("rechaza una cantidad igual a cero con NX-SYS-006 sin consultar Supabase", async () => {
    const formData = crearFormData({ ...DATOS_VALIDOS, cantidad: "0" });

    const resultado = await registrarEntradaStock(ESTADO_REGISTRAR_ENTRADA_STOCK_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-006", exito: false });
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("rechaza una cantidad negativa con NX-SYS-006", async () => {
    const formData = crearFormData({ ...DATOS_VALIDOS, cantidad: "-5" });

    const resultado = await registrarEntradaStock(ESTADO_REGISTRAR_ENTRADA_STOCK_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-006", exito: false });
  });

  it("rechaza sin sesión activa con NX-SYS-002", async () => {
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(mockearSesion(null) as never);

    const resultado = await registrarEntradaStock(ESTADO_REGISTRAR_ENTRADA_STOCK_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-SYS-002", exito: false });
  });

  it("rechaza por falta de permisos (NX-SYS-003) cuando el solicitante es admin_nodexa", async () => {
    const solicitanteBuilder = crearBuilderSolicitante({
      data: { usuario_id: "u-admin", rol: "admin_nodexa", cliente_id: null },
      error: null,
    });
    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn(() => solicitanteBuilder),
      rpc: vi.fn(),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarEntradaStock(ESTADO_REGISTRAR_ENTRADA_STOCK_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-SYS-003", exito: false });
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("calcula el saldo resultante (50 + 20 = 70) y registra el diff de forma asíncrona", async () => {
    const solicitanteBuilder = crearBuilderSolicitante({
      data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID },
      error: null,
    });
    const movimiento = {
      movimiento_id: "m-1",
      cliente_id: CLIENTE_ID,
      producto_id: PRODUCTO_ID,
      usuario_id: USUARIO_ID,
      tipo: "entrada",
      cantidad: 20,
      saldo_resultante: 70,
    };
    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn(() => solicitanteBuilder),
      rpc: vi.fn(async () => ({ data: movimiento, error: null })),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarEntradaStock(ESTADO_REGISTRAR_ENTRADA_STOCK_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: null, exito: true });
    expect(supabaseMock.rpc).toHaveBeenCalledWith("registrar_entrada_stock", {
      p_producto_id: PRODUCTO_ID,
      p_cantidad: 20,
    });
    expect(registrarDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: CLIENTE_ID,
        usuarioId: USUARIO_ID,
        tablaAfectada: "movimientos_stock",
        registroId: "m-1",
        campoModificado: "entrada",
        valorAnterior: null,
        valorNuevo: "70",
      }),
    );
  });

  it("retorna NX-SYS-007 cuando el RPC falla con NO_DATA_FOUND (producto de otro tenant)", async () => {
    const solicitanteBuilder = crearBuilderSolicitante({
      data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID },
      error: null,
    });
    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn(() => solicitanteBuilder),
      rpc: vi.fn(async () => ({ data: null, error: { code: "P0002", message: "Producto no encontrado..." } })),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarEntradaStock(ESTADO_REGISTRAR_ENTRADA_STOCK_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-SYS-007", exito: false });
    expect(registrarDiff).not.toHaveBeenCalled();
  });

  it("retorna NX-SYS-001 ante cualquier otro error del RPC", async () => {
    const solicitanteBuilder = crearBuilderSolicitante({
      data: { usuario_id: USUARIO_ID, rol: "empleado", cliente_id: CLIENTE_ID },
      error: null,
    });
    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn(() => solicitanteBuilder),
      rpc: vi.fn(async () => ({ data: null, error: { message: "fallo de conexión" } })),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarEntradaStock(ESTADO_REGISTRAR_ENTRADA_STOCK_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-SYS-001", exito: false });
  });
});
