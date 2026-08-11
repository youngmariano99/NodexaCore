import { beforeEach, describe, expect, it, vi } from "vitest";

import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

import { registrarDevolucion } from "./registrarDevolucion";
import { ESTADO_REGISTRAR_DEVOLUCION_INICIAL } from "./tipos";

vi.mock("@/lib/supabase/server", () => ({
  crearClienteSupabaseServidor: vi.fn(),
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
    single: vi.fn(async () => resultado),
  };
  return builder;
}

function crearBuilderMaybeSingle(resultado: ResultadoSupabase) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => resultado),
  };
  return builder;
}

function mockearSesion(usuario: { id: string } | null) {
  return { auth: { getUser: vi.fn(async () => ({ data: { user: usuario } })) } };
}

function mockearSupabaseCompleto(opciones: {
  solicitante: ResultadoSupabase;
  modulo?: ResultadoSupabase;
  rpc?: ReturnType<typeof vi.fn>;
}) {
  const solicitanteBuilder = crearBuilderSingle(opciones.solicitante);
  const moduloBuilder = crearBuilderMaybeSingle(opciones.modulo ?? { data: { activo: true }, error: null });

  const from = vi.fn((tabla: string) => {
    if (tabla === "usuarios") return solicitanteBuilder;
    if (tabla === "tenant_modules") return moduloBuilder;
    throw new Error(`tabla no mockeada en el test: ${tabla}`);
  });

  return { ...mockearSesion({ id: AUTH_USER_ID }), from, rpc: opciones.rpc ?? vi.fn() };
}

function crearFormData(campos: { venta_id?: string; motivo?: string; items?: unknown }): FormData {
  const formData = new FormData();
  if (campos.venta_id !== undefined) formData.set("venta_id", campos.venta_id);
  if (campos.motivo !== undefined) formData.set("motivo", campos.motivo);
  if (campos.items !== undefined) formData.set("items", JSON.stringify(campos.items));
  return formData;
}

const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
const CLIENTE_ID = "c3333333-3333-4333-8333-333333333333";
const VENTA_ID = "aaaaaaaa-1111-4111-8111-111111111111";
const VENTA_ITEM_ID = "bbbbbbbb-1111-4111-8111-111111111111";

const DATOS_VALIDOS = {
  venta_id: VENTA_ID,
  motivo: "Producto con falla de fábrica",
  items: [{ ventaItemId: VENTA_ITEM_ID, cantidad: 2 }],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("registrarDevolucion", () => {
  it("rechaza sin ítems con NX-SYS-006 sin consultar Supabase", async () => {
    const formData = crearFormData({ ...DATOS_VALIDOS, items: [] });

    const resultado = await registrarDevolucion(ESTADO_REGISTRAR_DEVOLUCION_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-006", exito: false, devolucionId: null });
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("rechaza sin motivo con NX-SYS-006", async () => {
    const formData = crearFormData({ venta_id: VENTA_ID, motivo: "", items: DATOS_VALIDOS.items });

    const resultado = await registrarDevolucion(ESTADO_REGISTRAR_DEVOLUCION_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-006", exito: false, devolucionId: null });
  });

  it("rechaza sin sesión activa con NX-SYS-002", async () => {
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(mockearSesion(null) as never);

    const resultado = await registrarDevolucion(ESTADO_REGISTRAR_DEVOLUCION_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-SYS-002", exito: false, devolucionId: null });
  });

  it("rechaza por falta de permisos (NX-SYS-003) cuando el solicitante es empleado (solo comerciante autoriza devoluciones)", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { rol: "empleado", cliente_id: CLIENTE_ID }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarDevolucion(ESTADO_REGISTRAR_DEVOLUCION_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-SYS-003", exito: false, devolucionId: null });
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("retorna NX-DEV-001 si el módulo devoluciones no está activo en el tenant, sin invocar el RPC", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      modulo: { data: { activo: false }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarDevolucion(ESTADO_REGISTRAR_DEVOLUCION_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-DEV-001", exito: false, devolucionId: null });
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("retorna NX-DEV-001 si el tenant no tiene fila en tenant_modules para devoluciones", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      modulo: { data: null, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarDevolucion(ESTADO_REGISTRAR_DEVOLUCION_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-DEV-001", exito: false, devolucionId: null });
  });

  it("registra la devolución exitosa e invoca el RPC con los ítems mapeados", async () => {
    const devolucion = {
      devolucion_id: "d-1",
      cliente_id: CLIENTE_ID,
      venta_id: VENTA_ID,
      usuario_id: "u-1",
      motivo: DATOS_VALIDOS.motivo,
      estado: "registrada",
      monto_total: 240,
    };
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      rpc: vi.fn(async () => ({ data: devolucion, error: null })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarDevolucion(ESTADO_REGISTRAR_DEVOLUCION_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: null, exito: true, devolucionId: "d-1" });
    expect(supabaseMock.rpc).toHaveBeenCalledWith("fn_registrar_devolucion", {
      p_venta_id: VENTA_ID,
      p_motivo: DATOS_VALIDOS.motivo,
      p_items: [{ venta_item_id: VENTA_ITEM_ID, cantidad: 2 }],
    });
  });

  it("retorna NX-DEV-002 si el RPC rechaza por exceder la cantidad vendida (SQLSTATE custom NX006)", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      rpc: vi.fn(async () => ({
        data: null,
        error: { code: "NX006", message: "No podés devolver más unidades de las que se vendieron originalmente." },
      })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarDevolucion(ESTADO_REGISTRAR_DEVOLUCION_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-DEV-002", exito: false, devolucionId: null });
  });

  it("retorna NX-DEV-003 si el RPC rechaza porque la venta ya fue devuelta por completo (SQLSTATE custom NX007)", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      rpc: vi.fn(async () => ({ data: null, error: { code: "NX007", message: "Esta venta ya fue devuelta por completo." } })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarDevolucion(ESTADO_REGISTRAR_DEVOLUCION_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-DEV-003", exito: false, devolucionId: null });
  });

  it("retorna NX-DEV-004 si el RPC falla al generar la nota de crédito (SQLSTATE custom NX008)", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      rpc: vi.fn(async () => ({ data: null, error: { code: "NX008", message: "No pudimos generar la nota de crédito." } })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarDevolucion(ESTADO_REGISTRAR_DEVOLUCION_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-DEV-004", exito: false, devolucionId: null });
  });

  it("retorna NX-VTA-004 cuando el RPC no encuentra la venta en este comercio (SQLSTATE P0002)", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      rpc: vi.fn(async () => ({ data: null, error: { code: "P0002", message: "no encontrada" } })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarDevolucion(ESTADO_REGISTRAR_DEVOLUCION_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-VTA-004", exito: false, devolucionId: null });
  });

  it("retorna NX-SYS-001 ante cualquier otro error del RPC", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      rpc: vi.fn(async () => ({ data: null, error: { message: "fallo de conexión" } })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await registrarDevolucion(ESTADO_REGISTRAR_DEVOLUCION_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-SYS-001", exito: false, devolucionId: null });
  });
});
