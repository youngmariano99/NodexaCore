import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { obtenerPreciosProductosPorIds } from "@/repositories/productosRepository";

import { POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  crearClienteSupabaseServidor: vi.fn(),
}));

vi.mock("@/repositories/productosRepository", async () => {
  const actual = await vi.importActual<typeof import("@/repositories/productosRepository")>(
    "@/repositories/productosRepository",
  );
  return { ...actual, obtenerPreciosProductosPorIds: vi.fn() };
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

function crearRequest(cuerpo?: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/ventas/previsualizar", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
}

const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
const CLIENTE_ID = "a1111111-1111-4111-8111-111111111111";
const PRODUCTO_ID_1 = "b1111111-1111-4111-8111-111111111111";
const PRODUCTO_ID_2 = "b2222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/ventas/previsualizar", () => {
  it("retorna 401 con NX-SYS-002 sin sesión activa", async () => {
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(mockearSesion(null) as never);

    const respuesta = await POST(crearRequest({ items: [] }));

    expect(respuesta.status).toBe(401);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-SYS-002" }));
  });

  it("retorna 403 con NX-SYS-003 cuando el solicitante es admin_nodexa", async () => {
    const solicitanteBuilder = crearBuilder({ data: { rol: "admin_nodexa", cliente_id: null }, error: null });
    const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: vi.fn(() => solicitanteBuilder) };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const respuesta = await POST(crearRequest({ items: [] }));

    expect(respuesta.status).toBe(403);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-SYS-003" }));
    expect(obtenerPreciosProductosPorIds).not.toHaveBeenCalled();
  });

  it("retorna 400 con NX-SYS-006 ante un body que no es JSON válido", async () => {
    const solicitanteBuilder = crearBuilder({ data: { rol: "comerciante", cliente_id: CLIENTE_ID }, error: null });
    const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: vi.fn(() => solicitanteBuilder) };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const respuesta = await POST(crearRequest());

    expect(respuesta.status).toBe(400);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-SYS-006" }));
  });

  it("retorna 400 con NX-SYS-006 si un ítem trae cantidad negativa o productoId inválido", async () => {
    const solicitanteBuilder = crearBuilder({ data: { rol: "comerciante", cliente_id: CLIENTE_ID }, error: null });
    const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: vi.fn(() => solicitanteBuilder) };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const respuesta = await POST(crearRequest({ items: [{ productoId: "no-es-uuid", cantidad: -1 }] }));

    expect(respuesta.status).toBe(400);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-SYS-006" }));
    expect(obtenerPreciosProductosPorIds).not.toHaveBeenCalled();
  });

  it("retorna total 0 con items:[] sin consultar precios, ante un arreglo vacío", async () => {
    const solicitanteBuilder = crearBuilder({ data: { rol: "comerciante", cliente_id: CLIENTE_ID }, error: null });
    const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: vi.fn(() => solicitanteBuilder) };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const respuesta = await POST(crearRequest({ items: [] }));

    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ total: 0, items: [] });
    expect(obtenerPreciosProductosPorIds).not.toHaveBeenCalled();
  });

  it("recalcula el total usando el precio real de la base, ignorando cualquier precio que mandara el cliente", async () => {
    const solicitanteBuilder = crearBuilder({ data: { rol: "comerciante", cliente_id: CLIENTE_ID }, error: null });
    const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: vi.fn(() => solicitanteBuilder) };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    vi.mocked(obtenerPreciosProductosPorIds).mockResolvedValue({
      ok: true,
      data: [
        { producto_id: PRODUCTO_ID_1, precio: 3500 },
        { producto_id: PRODUCTO_ID_2, precio: 19.99 },
      ],
    });

    const respuesta = await POST(
      crearRequest({
        // precioUnitario acá sería ignorado incluso si el body lo trajera: el
        // esquema Zod ni siquiera lo acepta como campo del ítem.
        items: [
          { productoId: PRODUCTO_ID_1, cantidad: 2 },
          { productoId: PRODUCTO_ID_2, cantidad: 5 },
        ],
      }),
    );

    expect(respuesta.status).toBe(200);
    expect(obtenerPreciosProductosPorIds).toHaveBeenCalledWith(expect.anything(), CLIENTE_ID, [
      PRODUCTO_ID_1,
      PRODUCTO_ID_2,
    ]);
    const cuerpo = await respuesta.json();
    expect(cuerpo.total).toBe(7099.95);
    expect(cuerpo.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ productoId: PRODUCTO_ID_1, precioUnitario: 3500, cantidad: 2, subtotal: 7000 }),
        expect.objectContaining({ productoId: PRODUCTO_ID_2, precioUnitario: 19.99, cantidad: 5, subtotal: 99.95 }),
      ]),
    );
  });

  it("retorna 403 con NX-SYS-007 si algún producto no pertenece al tenant o no existe", async () => {
    const solicitanteBuilder = crearBuilder({ data: { rol: "comerciante", cliente_id: CLIENTE_ID }, error: null });
    const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: vi.fn(() => solicitanteBuilder) };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    vi.mocked(obtenerPreciosProductosPorIds).mockResolvedValue({
      ok: true,
      data: [{ producto_id: PRODUCTO_ID_1, precio: 3500 }],
    });

    const respuesta = await POST(
      crearRequest({
        items: [
          { productoId: PRODUCTO_ID_1, cantidad: 1 },
          { productoId: PRODUCTO_ID_2, cantidad: 1 },
        ],
      }),
    );

    expect(respuesta.status).toBe(403);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-SYS-007" }));
  });

  it("retorna 500 con el código del repositorio si la consulta de precios falla", async () => {
    const solicitanteBuilder = crearBuilder({ data: { rol: "empleado", cliente_id: CLIENTE_ID }, error: null });
    const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: vi.fn(() => solicitanteBuilder) };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    vi.mocked(obtenerPreciosProductosPorIds).mockResolvedValue({ ok: false, error: "NX-SYS-001" });

    const respuesta = await POST(crearRequest({ items: [{ productoId: PRODUCTO_ID_1, cantidad: 1 }] }));

    expect(respuesta.status).toBe(500);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-SYS-001" }));
  });

  it("deduplica producto_id repetidos antes de consultar precios", async () => {
    const solicitanteBuilder = crearBuilder({ data: { rol: "comerciante", cliente_id: CLIENTE_ID }, error: null });
    const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: vi.fn(() => solicitanteBuilder) };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    vi.mocked(obtenerPreciosProductosPorIds).mockResolvedValue({
      ok: true,
      data: [{ producto_id: PRODUCTO_ID_1, precio: 100 }],
    });

    await POST(
      crearRequest({
        items: [
          { productoId: PRODUCTO_ID_1, cantidad: 1 },
          { productoId: PRODUCTO_ID_1, cantidad: 2 },
        ],
      }),
    );

    expect(obtenerPreciosProductosPorIds).toHaveBeenCalledWith(expect.anything(), CLIENTE_ID, [PRODUCTO_ID_1]);
  });
});
