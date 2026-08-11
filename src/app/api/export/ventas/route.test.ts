import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { obtenerTodasLasVentasActivas, obtenerTodosLosVentaItemsActivos } from "@/repositories/ventas";

import { GET } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  crearClienteSupabaseServidor: vi.fn(),
}));

vi.mock("@/repositories/ventas", async () => {
  const actual = await vi.importActual<typeof import("@/repositories/ventas")>("@/repositories/ventas");
  return {
    ...actual,
    obtenerTodasLasVentasActivas: vi.fn(),
    obtenerTodosLosVentaItemsActivos: vi.fn(),
  };
});

interface ResultadoSupabase {
  data: unknown;
  error: unknown;
}

function crearBuilder(resultado: ResultadoSupabase) {
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

function crearRequest(query = ""): NextRequest {
  return new NextRequest(`http://localhost:3000/api/export/ventas${query}`);
}

const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
const CLIENTE_ID = "b2222222-2222-4222-8222-222222222222";
const CLIENTE_ID_AJENO = "c3333333-3333-4333-8333-333333333333";

const VENTA_EJEMPLO = {
  venta_id: "v-1",
  cliente_final_id: null,
  total: 1000,
  estado: "confirmada" as const,
  creado_en: "2026-08-01T10:00:00.000Z",
};

const VENTA_ITEM_EJEMPLO = {
  venta_item_id: "vi-1",
  venta_id: "v-1",
  producto_id: "p-1",
  cantidad: 2,
  precio_unitario: 500,
  subtotal: 1000,
};

beforeEach(() => {
  vi.clearAllMocks();
});

function mockearSolicitanteComerciante() {
  const solicitanteBuilder = crearBuilder({ data: { rol: "comerciante", cliente_id: CLIENTE_ID }, error: null });
  const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: vi.fn(() => solicitanteBuilder) };
  vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
  return supabaseMock;
}

describe("GET /api/export/ventas", () => {
  it("retorna 400 con NX-SYS-006 ante un formato inválido, sin consultar Supabase", async () => {
    const respuesta = await GET(crearRequest("?formato=xml"));

    expect(respuesta.status).toBe(400);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-SYS-006" }));
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("retorna 401 con NX-SYS-002 sin sesión activa", async () => {
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(mockearSesion(null) as never);

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(401);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-SYS-002" }));
  });

  it("retorna 403 con NX-SYS-003 cuando el solicitante es empleado", async () => {
    const solicitanteBuilder = crearBuilder({ data: { rol: "empleado", cliente_id: CLIENTE_ID }, error: null });
    const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: vi.fn(() => solicitanteBuilder) };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(403);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-SYS-003" }));
    expect(obtenerTodasLasVentasActivas).not.toHaveBeenCalled();
  });

  it("retorna 403 con NX-SYS-007 ante un cliente_id ajeno manipulado en la query string", async () => {
    mockearSolicitanteComerciante();

    const respuesta = await GET(crearRequest(`?clienteId=${CLIENTE_ID_AJENO}`));

    expect(respuesta.status).toBe(403);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-SYS-007" }));
    expect(obtenerTodasLasVentasActivas).not.toHaveBeenCalled();
    expect(obtenerTodosLosVentaItemsActivos).not.toHaveBeenCalled();
  });

  it("permite el request cuando clienteId en la query coincide con el de la sesión", async () => {
    mockearSolicitanteComerciante();
    vi.mocked(obtenerTodasLasVentasActivas).mockResolvedValue({ ok: true, data: [] });
    vi.mocked(obtenerTodosLosVentaItemsActivos).mockResolvedValue({ ok: true, data: [] });

    const respuesta = await GET(crearRequest(`?clienteId=${CLIENTE_ID}`));

    expect(respuesta.status).toBe(200);
  });

  it("resuelve el cliente_id de la consulta real desde la sesión, no desde la query string", async () => {
    mockearSolicitanteComerciante();
    vi.mocked(obtenerTodasLasVentasActivas).mockResolvedValue({ ok: true, data: [] });
    vi.mocked(obtenerTodosLosVentaItemsActivos).mockResolvedValue({ ok: true, data: [] });

    await GET(crearRequest());

    expect(obtenerTodasLasVentasActivas).toHaveBeenCalledWith(expect.anything(), CLIENTE_ID);
    expect(obtenerTodosLosVentaItemsActivos).toHaveBeenCalledWith(expect.anything(), CLIENTE_ID);
  });

  it("responde CSV con ambas secciones (formato=csv)", async () => {
    mockearSolicitanteComerciante();
    vi.mocked(obtenerTodasLasVentasActivas).mockResolvedValue({ ok: true, data: [VENTA_EJEMPLO] });
    vi.mocked(obtenerTodosLosVentaItemsActivos).mockResolvedValue({ ok: true, data: [VENTA_ITEM_EJEMPLO] });

    const respuesta = await GET(crearRequest("?formato=csv"));
    const texto = await respuesta.text();

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(respuesta.headers.get("Content-Disposition")).toContain("attachment; filename=");
    expect(texto).toContain("# ventas");
    expect(texto).toContain("v-1,,1000,confirmada");
    expect(texto).toContain("# venta_items");
    expect(texto).toContain("vi-1,v-1,p-1,2,500,1000");
  });

  it("por defecto (sin query param formato) exporta CSV", async () => {
    mockearSolicitanteComerciante();
    vi.mocked(obtenerTodasLasVentasActivas).mockResolvedValue({ ok: true, data: [] });
    vi.mocked(obtenerTodosLosVentaItemsActivos).mockResolvedValue({ ok: true, data: [] });

    const respuesta = await GET(crearRequest());

    expect(respuesta.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
  });

  it("responde JSON válido y bien estructurado (formato=json)", async () => {
    mockearSolicitanteComerciante();
    vi.mocked(obtenerTodasLasVentasActivas).mockResolvedValue({ ok: true, data: [VENTA_EJEMPLO] });
    vi.mocked(obtenerTodosLosVentaItemsActivos).mockResolvedValue({ ok: true, data: [VENTA_ITEM_EJEMPLO] });

    const respuesta = await GET(crearRequest("?formato=json"));
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(200);
    expect(cuerpo).toEqual(
      expect.objectContaining({
        clienteId: CLIENTE_ID,
        total: { ventas: 1, ventaItems: 1 },
        ventas: [VENTA_EJEMPLO],
        ventaItems: [VENTA_ITEM_EJEMPLO],
      }),
    );
    expect(typeof cuerpo.exportadoEn).toBe("string");
  });

  it("retorna 500 con el código del repositorio si falla la consulta de ventas", async () => {
    mockearSolicitanteComerciante();
    vi.mocked(obtenerTodasLasVentasActivas).mockResolvedValue({ ok: false, error: "NX-SYS-001" });
    vi.mocked(obtenerTodosLosVentaItemsActivos).mockResolvedValue({ ok: true, data: [] });

    const respuesta = await GET(crearRequest("?formato=json"));

    expect(respuesta.status).toBe(500);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-SYS-001" }));
  });

  it("retorna 500 con el código del repositorio si falla la consulta de venta_items", async () => {
    mockearSolicitanteComerciante();
    vi.mocked(obtenerTodasLasVentasActivas).mockResolvedValue({ ok: true, data: [] });
    vi.mocked(obtenerTodosLosVentaItemsActivos).mockResolvedValue({ ok: false, error: "NX-SYS-001" });

    const respuesta = await GET(crearRequest("?formato=json"));

    expect(respuesta.status).toBe(500);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-SYS-001" }));
  });
});
