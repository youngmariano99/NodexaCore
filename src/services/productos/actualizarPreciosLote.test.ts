import { beforeEach, describe, expect, it, vi } from "vitest";

import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

import { actualizarPreciosLote } from "./actualizarPreciosLote";
import { ESTADO_ACTUALIZAR_PRECIOS_LOTE_INICIAL } from "./tipos";

vi.mock("@/lib/supabase/server", () => ({
  crearClienteSupabaseServidor: vi.fn(),
}));

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
const FILTRO_ID = "b1111111-1111-4111-8111-111111111111";

const DATOS_VALIDOS = {
  tipoFiltro: "categoria_id",
  filtroId: FILTRO_ID,
  tipoAjuste: "porcentaje",
  valor: "15",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("actualizarPreciosLote", () => {
  it("rechaza inputs inválidos con NX-SYS-006", async () => {
    const formData = crearFormData({
      tipoFiltro: "invalido",
      tipoAjuste: "porcentaje",
      valor: "abc",
    });

    const resultado = await actualizarPreciosLote(ESTADO_ACTUALIZAR_PRECIOS_LOTE_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-006", exito: false });
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("rechaza sin sesión activa con NX-SYS-002", async () => {
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(mockearSesion(null) as never);

    const resultado = await actualizarPreciosLote(
      ESTADO_ACTUALIZAR_PRECIOS_LOTE_INICIAL,
      crearFormData(DATOS_VALIDOS),
    );

    expect(resultado).toEqual({ error: "NX-SYS-002", exito: false });
  });

  it("rechaza por falta de permisos (NX-SYS-003) cuando el solicitante es admin_nodexa", async () => {
    const solicitanteBuilder = crearBuilder({
      data: { usuario_id: "u-admin", rol: "admin_nodexa", cliente_id: null },
      error: null,
    });
    const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: vi.fn(() => solicitanteBuilder) };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await actualizarPreciosLote(
      ESTADO_ACTUALIZAR_PRECIOS_LOTE_INICIAL,
      crearFormData(DATOS_VALIDOS),
    );

    expect(resultado).toEqual({ error: "NX-SYS-003", exito: false });
  });

  it("ejecuta correctamente la llamada RPC en Supabase para actualizar precios y retorna cantidad afectada", async () => {
    const solicitanteBuilder = crearBuilder({
      data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID },
      error: null,
    });

    const rpcMock = vi.fn().mockResolvedValue({ data: 42, error: null });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn().mockReturnValueOnce(solicitanteBuilder),
      rpc: rpcMock,
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await actualizarPreciosLote(
      ESTADO_ACTUALIZAR_PRECIOS_LOTE_INICIAL,
      crearFormData(DATOS_VALIDOS),
    );

    expect(resultado).toEqual({ error: null, exito: true, cantidadAfectada: 42 });
    expect(rpcMock).toHaveBeenCalledWith("fn_actualizar_precios_lote", {
      p_cliente_id: CLIENTE_ID,
      p_usuario_id: USUARIO_ID,
      p_tipo_filtro: "categoria_id",
      p_filtro_id: FILTRO_ID,
      p_tipo_ajuste: "porcentaje",
      p_valor: 15,
    });
  });
});
