import { beforeEach, describe, expect, it, vi } from "vitest";

import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

import { confirmarVenta } from "./confirmarVenta";
import { ESTADO_CONFIRMAR_VENTA_INICIAL } from "./tipos";

vi.mock("@/lib/supabase/server", () => ({
  crearClienteSupabaseServidor: vi.fn(),
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

function crearFormData(campos: Record<string, string>): FormData {
  const formData = new FormData();
  Object.entries(campos).forEach(([clave, valor]) => formData.set(clave, valor));
  return formData;
}

const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
const CLIENTE_ID = "a1111111-1111-4111-8111-111111111111";
const USUARIO_ID = "u-comerciante";
const PRODUCTO_ID = "b1111111-1111-4111-8111-111111111111";
const IDEMPOTENCY_KEY = "c1111111-1111-4111-8111-111111111111";

const ITEMS_VALIDOS = JSON.stringify([{ productoId: PRODUCTO_ID, cantidad: 2 }]);

const DATOS_VALIDOS = {
  idempotency_key: IDEMPOTENCY_KEY,
  items: ITEMS_VALIDOS,
  total: "7000",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("confirmarVenta", () => {
  it("rechaza con NX-SYS-006 sin consultar Supabase si el idempotency_key no es un UUID válido", async () => {
    const formData = crearFormData({ ...DATOS_VALIDOS, idempotency_key: "no-es-un-uuid" });

    const resultado = await confirmarVenta(ESTADO_CONFIRMAR_VENTA_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-006", exito: false, ventaId: null });
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("rechaza con NX-SYS-006 sin consultar Supabase si el carrito llega vacío", async () => {
    const formData = crearFormData({ ...DATOS_VALIDOS, items: JSON.stringify([]) });

    const resultado = await confirmarVenta(ESTADO_CONFIRMAR_VENTA_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-006", exito: false, ventaId: null });
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("rechaza con NX-SYS-006 si el campo items no es JSON válido", async () => {
    const formData = crearFormData({ ...DATOS_VALIDOS, items: "{no-es-json" });

    const resultado = await confirmarVenta(ESTADO_CONFIRMAR_VENTA_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-006", exito: false, ventaId: null });
  });

  it("rechaza con NX-VTA-003 sin llamar al RPC cuando el total es negativo", async () => {
    const formData = crearFormData({ ...DATOS_VALIDOS, total: "-100" });

    const resultado = await confirmarVenta(ESTADO_CONFIRMAR_VENTA_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-VTA-003", exito: false, ventaId: null });
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("rechaza con NX-SYS-002 sin sesión activa", async () => {
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(mockearSesion(null) as never);

    const resultado = await confirmarVenta(ESTADO_CONFIRMAR_VENTA_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-SYS-002", exito: false, ventaId: null });
  });

  it("rechaza con NX-SYS-003 cuando el solicitante es admin_nodexa", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { rol: "admin_nodexa", cliente_id: null }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await confirmarVenta(ESTADO_CONFIRMAR_VENTA_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-SYS-003", exito: false, ventaId: null });
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("inserta la venta correctamente con un idempotency_key único (primer envío)", async () => {
    const venta = {
      venta_id: "venta-1",
      cliente_id: CLIENTE_ID,
      usuario_id: USUARIO_ID,
      cliente_final_id: null,
      total: 7000,
      estado: "confirmada",
      idempotency_key: IDEMPOTENCY_KEY,
    };
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      rpc: vi.fn(async () => ({ data: venta, error: null })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await confirmarVenta(ESTADO_CONFIRMAR_VENTA_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: null, exito: true, ventaId: "venta-1" });
    expect(supabaseMock.rpc).toHaveBeenCalledWith("fn_confirmar_venta", {
      p_idempotency_key: IDEMPOTENCY_KEY,
      p_cliente_final_id: null,
      p_items: [{ producto_id: PRODUCTO_ID, cantidad: 2 }],
      p_metodo_pago: "efectivo",
      p_porcentaje_ajuste: 0,
      p_monto_ajuste: 0,
    });
  });

  it("retorna NX-VTA-001 sin registrar nada cuando el RPC reporta stock insuficiente en algún ítem", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      rpc: vi.fn(async () => ({
        data: null,
        error: { code: "NX001", message: "No hay stock suficiente de este producto para completar la venta." },
      })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await confirmarVenta(ESTADO_CONFIRMAR_VENTA_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-VTA-001", exito: false, ventaId: null });
  });

  it("retorna NX-VTA-002 sin duplicar el registro cuando el mismo idempotency_key se envía dos veces", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      rpc: vi.fn(async () => ({ data: null, error: { code: "NX002", message: "Esta venta ya fue registrada." } })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await confirmarVenta(ESTADO_CONFIRMAR_VENTA_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-VTA-002", exito: false, ventaId: null });
  });

  it("retorna NX-SYS-007 cuando el RPC falla con NO_DATA_FOUND (producto de otro tenant)", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { rol: "empleado", cliente_id: CLIENTE_ID }, error: null },
      rpc: vi.fn(async () => ({ data: null, error: { code: "P0002", message: "..." } })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await confirmarVenta(ESTADO_CONFIRMAR_VENTA_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-SYS-007", exito: false, ventaId: null });
  });

  it("retorna NX-VTA-005 ante cualquier otro error del RPC", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      rpc: vi.fn(async () => ({ data: null, error: { message: "fallo de conexión" } })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await confirmarVenta(ESTADO_CONFIRMAR_VENTA_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-VTA-005", exito: false, ventaId: null });
  });

  it("pasa cliente_final_id como null cuando no viene en el formulario (venta sin cuenta corriente)", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      rpc: vi.fn(async () => ({
        data: { venta_id: "venta-1", total: 7000, estado: "confirmada" },
        error: null,
      })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    await confirmarVenta(ESTADO_CONFIRMAR_VENTA_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      "fn_confirmar_venta",
      expect.objectContaining({ p_cliente_final_id: null }),
    );
  });
});
