import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { obtenerMovimientosStockPaginados } from "@/repositories/movimientosStockRepository";

import { GET } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  crearClienteSupabaseServidor: vi.fn(),
}));

vi.mock("@/repositories/movimientosStockRepository", async () => {
  const actual = await vi.importActual<typeof import("@/repositories/movimientosStockRepository")>(
    "@/repositories/movimientosStockRepository",
  );
  return { ...actual, obtenerMovimientosStockPaginados: vi.fn() };
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
  return new NextRequest(`http://localhost:3000/api/stock${query}`);
}

const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
const CLIENTE_ID = "a1111111-1111-4111-8111-111111111111";
const PRODUCTO_ID = "b1111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/stock", () => {
  it("retorna 401 con NX-SYS-002 sin sesión activa", async () => {
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(mockearSesion(null) as never);

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(401);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-SYS-002" }));
  });

  it("retorna 403 con NX-SYS-003 cuando el solicitante es admin_nodexa", async () => {
    const solicitanteBuilder = crearBuilder({ data: { rol: "admin_nodexa", cliente_id: null }, error: null });
    const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: vi.fn(() => solicitanteBuilder) };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(403);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-SYS-003" }));
    expect(obtenerMovimientosStockPaginados).not.toHaveBeenCalled();
  });

  it("pasa pagina, porPagina y productoId de la query string al repositorio y retorna sus datos", async () => {
    const solicitanteBuilder = crearBuilder({ data: { rol: "comerciante", cliente_id: CLIENTE_ID }, error: null });
    const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: vi.fn(() => solicitanteBuilder) };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    vi.mocked(obtenerMovimientosStockPaginados).mockResolvedValue({
      ok: true,
      data: { movimientos: [], total: 50, pagina: 2, porPagina: 25 },
    });

    const respuesta = await GET(crearRequest(`?pagina=2&porPagina=25&productoId=${PRODUCTO_ID}`));

    expect(respuesta.status).toBe(200);
    expect(obtenerMovimientosStockPaginados).toHaveBeenCalledWith(expect.anything(), CLIENTE_ID, 2, 25, PRODUCTO_ID);
    expect(await respuesta.json()).toEqual({ movimientos: [], total: 50, pagina: 2, porPagina: 25 });
  });

  it("no pasa productoId al repositorio cuando no viene en la query string", async () => {
    const solicitanteBuilder = crearBuilder({ data: { rol: "empleado", cliente_id: CLIENTE_ID }, error: null });
    const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: vi.fn(() => solicitanteBuilder) };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    vi.mocked(obtenerMovimientosStockPaginados).mockResolvedValue({
      ok: true,
      data: { movimientos: [], total: 0, pagina: 1, porPagina: 25 },
    });

    await GET(crearRequest());

    expect(obtenerMovimientosStockPaginados).toHaveBeenCalledWith(expect.anything(), CLIENTE_ID, 1, 25, undefined);
  });

  it("retorna 500 con el código del repositorio si la consulta paginada falla", async () => {
    const solicitanteBuilder = crearBuilder({ data: { rol: "comerciante", cliente_id: CLIENTE_ID }, error: null });
    const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: vi.fn(() => solicitanteBuilder) };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    vi.mocked(obtenerMovimientosStockPaginados).mockResolvedValue({ ok: false, error: "NX-SYS-001" });

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(500);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-SYS-001" }));
  });
});
