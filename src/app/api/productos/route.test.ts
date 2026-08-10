import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { obtenerProductosPaginados } from "@/repositories/productosRepository";

import { GET } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  crearClienteSupabaseServidor: vi.fn(),
}));

vi.mock("@/repositories/productosRepository", async () => {
  const actual = await vi.importActual<typeof import("@/repositories/productosRepository")>(
    "@/repositories/productosRepository",
  );
  return { ...actual, obtenerProductosPaginados: vi.fn() };
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
  return new NextRequest(`http://localhost:3000/api/productos${query}`);
}

const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
const CLIENTE_ID = "a1111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/productos", () => {
  it("retorna 401 con NX-SYS-002 sin sesión activa", async () => {
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(mockearSesion(null) as never);

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(401);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-SYS-002" }));
  });

  it("retorna 403 con NX-SYS-003 cuando el solicitante es admin_nodexa", async () => {
    const solicitanteBuilder = crearBuilder({
      data: { rol: "admin_nodexa", cliente_id: null },
      error: null,
    });
    const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: vi.fn(() => solicitanteBuilder) };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(403);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-SYS-003" }));
    expect(obtenerProductosPaginados).not.toHaveBeenCalled();
  });

  it("pasa pagina y porPagina de la query string al repositorio y retorna sus datos", async () => {
    const solicitanteBuilder = crearBuilder({
      data: { rol: "comerciante", cliente_id: CLIENTE_ID },
      error: null,
    });
    const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: vi.fn(() => solicitanteBuilder) };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    vi.mocked(obtenerProductosPaginados).mockResolvedValue({
      ok: true,
      data: { productos: [], total: 50, pagina: 2, porPagina: 25 },
    });

    const respuesta = await GET(crearRequest("?pagina=2&porPagina=25"));

    expect(respuesta.status).toBe(200);
    expect(obtenerProductosPaginados).toHaveBeenCalledWith(expect.anything(), CLIENTE_ID, 2, 25);
    expect(await respuesta.json()).toEqual({ productos: [], total: 50, pagina: 2, porPagina: 25 });
  });

  it("retorna 500 con el código del repositorio si la consulta paginada falla", async () => {
    const solicitanteBuilder = crearBuilder({
      data: { rol: "empleado", cliente_id: CLIENTE_ID },
      error: null,
    });
    const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: vi.fn(() => solicitanteBuilder) };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    vi.mocked(obtenerProductosPaginados).mockResolvedValue({ ok: false, error: "NX-SYS-001" });

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(500);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-SYS-001" }));
  });
});
