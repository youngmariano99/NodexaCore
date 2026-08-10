import { beforeEach, describe, expect, it, vi } from "vitest";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

import { registrarSalidaStock } from "./registrarSalidaStock";
import { ESTADO_REGISTRAR_SALIDA_STOCK_INICIAL } from "./tipos";

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

function crearBuilderProducto(resultado: { data: { stock_actual: number } | null; error: unknown }) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => resultado),
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

function mockearSupabaseCompleto(opciones: {
  solicitante: ResultadoSupabase;
  producto?: { data: { stock_actual: number } | null; error: unknown };
  rpc?: ReturnType<typeof vi.fn>;
}) {
  const solicitanteBuilder = crearBuilderSolicitante(opciones.solicitante);
  const productoBuilder = crearBuilderProducto(opciones.producto ?? { data: null, error: null });

  const from = vi.fn((tabla: string) => {
    if (tabla === "usuarios") return solicitanteBuilder;
    if (tabla === "productos") return productoBuilder;
    throw new Error(`tabla no mockeada en el test: ${tabla}`);
  });

  return { ...mockearSesion({ id: AUTH_USER_ID }), from, rpc: opciones.rpc ?? vi.fn() };
}

const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
const CLIENTE_ID = "a1111111-1111-4111-8111-111111111111";
const USUARIO_ID = "u-comerciante";
const PRODUCTO_ID = "b1111111-1111-4111-8111-111111111111";

const DATOS_VALIDOS = { producto_id: PRODUCTO_ID, cantidad: "5" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("registrarSalidaStock", () => {
  it("rechaza una cantidad igual a cero con NX-SYS-006 sin consultar Supabase", async () => {
    const formData = crearFormData({ ...DATOS_VALIDOS, cantidad: "0" });

    const resultado = await registrarSalidaStock(ESTADO_REGISTRAR_SALIDA_STOCK_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-006", exito: false });
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("rechaza sin sesión activa con NX-SYS-002", async () => {
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(mockearSesion(null) as never);

    const resultado = await registrarSalidaStock(ESTADO_REGISTRAR_SALIDA_STOCK_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-SYS-002", exito: false });
  });

  it("rechaza por falta de permisos (NX-SYS-003) cuando el solicitante es admin_nodexa", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: "u-admin", rol: "admin_nodexa", cliente_id: null }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarSalidaStock(ESTADO_REGISTRAR_SALIDA_STOCK_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-SYS-003", exito: false });
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("corta en Fail-Fast con NX-PRD-004 sin llamar al RPC cuando la lectura previa ya muestra saldo insuficiente (10 en stock, sale 15)", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      producto: { data: { stock_actual: 10 }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarSalidaStock(
      ESTADO_REGISTRAR_SALIDA_STOCK_INICIAL,
      crearFormData({ producto_id: PRODUCTO_ID, cantidad: "15" }),
    );

    expect(resultado).toEqual({ error: "NX-PRD-004", exito: false });
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
    expect(registrarDiff).not.toHaveBeenCalled();
  });

  it("permite una salida que deja el saldo en exactamente cero (caso límite: 10 en stock, sale 10)", async () => {
    const movimiento = {
      movimiento_id: "m-cero",
      cliente_id: CLIENTE_ID,
      producto_id: PRODUCTO_ID,
      usuario_id: USUARIO_ID,
      tipo: "salida",
      cantidad: 10,
      saldo_resultante: 0,
    };
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      producto: { data: { stock_actual: 10 }, error: null },
      rpc: vi.fn(async () => ({ data: movimiento, error: null })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarSalidaStock(
      ESTADO_REGISTRAR_SALIDA_STOCK_INICIAL,
      crearFormData({ producto_id: PRODUCTO_ID, cantidad: "10" }),
    );

    expect(resultado).toEqual({ error: null, exito: true });
    expect(supabaseMock.rpc).toHaveBeenCalledWith("fn_registrar_movimiento_stock", {
      p_producto_id: PRODUCTO_ID,
      p_tipo: "salida",
      p_cantidad: 10,
    });
  });

  it("retorna NX-PRD-004 si el RPC igual rechaza el movimiento por saldo insuficiente (ej. lectura previa desactualizada por concurrencia)", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      producto: { data: { stock_actual: 20 }, error: null },
      rpc: vi.fn(async () => ({ data: null, error: { code: "NX004", message: "No podés dejar stock en negativo." } })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarSalidaStock(
      ESTADO_REGISTRAR_SALIDA_STOCK_INICIAL,
      crearFormData({ producto_id: PRODUCTO_ID, cantidad: "15" }),
    );

    expect(resultado).toEqual({ error: "NX-PRD-004", exito: false });
    expect(supabaseMock.rpc).toHaveBeenCalled();
    expect(registrarDiff).not.toHaveBeenCalled();
  });

  it("omite el chequeo Fail-Fast y deja que el RPC decida cuando la lectura previa no encuentra el producto (de otro tenant o inexistente)", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      producto: { data: null, error: null },
      rpc: vi.fn(async () => ({ data: null, error: { code: "P0002", message: "Producto no encontrado..." } })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarSalidaStock(ESTADO_REGISTRAR_SALIDA_STOCK_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-SYS-007", exito: false });
    expect(supabaseMock.rpc).toHaveBeenCalled();
  });

  it("descuenta el stock (10 - 5 = 5) y registra el diff con tipo salida", async () => {
    const movimiento = {
      movimiento_id: "m-2",
      cliente_id: CLIENTE_ID,
      producto_id: PRODUCTO_ID,
      usuario_id: USUARIO_ID,
      tipo: "salida",
      cantidad: 5,
      saldo_resultante: 5,
    };
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "empleado", cliente_id: CLIENTE_ID }, error: null },
      producto: { data: { stock_actual: 10 }, error: null },
      rpc: vi.fn(async () => ({ data: movimiento, error: null })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarSalidaStock(ESTADO_REGISTRAR_SALIDA_STOCK_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: null, exito: true });
    expect(supabaseMock.rpc).toHaveBeenCalledWith("fn_registrar_movimiento_stock", {
      p_producto_id: PRODUCTO_ID,
      p_tipo: "salida",
      p_cantidad: 5,
    });
    expect(registrarDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: CLIENTE_ID,
        usuarioId: USUARIO_ID,
        tablaAfectada: "movimientos_stock",
        registroId: "m-2",
        campoModificado: "salida",
        valorAnterior: null,
        valorNuevo: "5",
      }),
    );
  });

  it("retorna NX-SYS-007 cuando el RPC falla con NO_DATA_FOUND (producto de otro tenant)", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      producto: { data: { stock_actual: 100 }, error: null },
      rpc: vi.fn(async () => ({ data: null, error: { code: "P0002", message: "Producto no encontrado..." } })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarSalidaStock(ESTADO_REGISTRAR_SALIDA_STOCK_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-SYS-007", exito: false });
  });

  it("retorna NX-SYS-001 ante cualquier otro error del RPC", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      producto: { data: { stock_actual: 100 }, error: null },
      rpc: vi.fn(async () => ({ data: null, error: { message: "fallo de conexión" } })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarSalidaStock(ESTADO_REGISTRAR_SALIDA_STOCK_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-SYS-001", exito: false });
  });
});
