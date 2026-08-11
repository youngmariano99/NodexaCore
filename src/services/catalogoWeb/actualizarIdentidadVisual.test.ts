import { beforeEach, describe, expect, it, vi } from "vitest";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

import { actualizarIdentidadVisual } from "./actualizarIdentidadVisual";
import { ESTADO_ACTUALIZAR_IDENTIDAD_VISUAL_INICIAL } from "./tipos";

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

function crearBuilderSingle(resultado: ResultadoSupabase) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => resultado),
    single: vi.fn(async () => resultado),
  };
  return builder;
}

function mockearSesion(usuario: { id: string } | null) {
  return { auth: { getUser: vi.fn(async () => ({ data: { user: usuario } })) } };
}

function mockearSupabaseCompleto(opciones: {
  solicitante: ResultadoSupabase;
  valoresPrevios?: ResultadoSupabase;
  rpc?: ReturnType<typeof vi.fn>;
}) {
  const solicitanteBuilder = crearBuilderSingle(opciones.solicitante);
  const previosBuilder = crearBuilderSingle(
    opciones.valoresPrevios ?? { data: { logo_url: null, color_primario: "#3B82F6" }, error: null },
  );

  const from = vi.fn((tabla: string) => {
    if (tabla === "usuarios") return solicitanteBuilder;
    if (tabla === "clientes") return previosBuilder;
    throw new Error(`tabla no mockeada en el test: ${tabla}`);
  });

  return { ...mockearSesion({ id: AUTH_USER_ID }), from, rpc: opciones.rpc ?? vi.fn() };
}

function crearFormData(campos: { logo_url?: string; color_primario?: string }): FormData {
  const formData = new FormData();
  if (campos.logo_url !== undefined) formData.set("logo_url", campos.logo_url);
  if (campos.color_primario !== undefined) formData.set("color_primario", campos.color_primario);
  return formData;
}

const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
const CLIENTE_ID = "a1111111-1111-4111-8111-111111111111";
const USUARIO_ID = "u-comerciante";
const COLOR_PERMITIDO = "#3B82F6";
const LOGO_URL = "https://cdn.nodexa.app/logos/bazar-casa-sur.webp";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("actualizarIdentidadVisual", () => {
  it.each(["#8B5CF6", "#A855F7", "#6366F1", "#D946EF"])(
    "rechaza el color %s (violeta/púrpura/índigo/fuchsia) con NX-SYS-006 sin consultar Supabase",
    async (colorProhibido) => {
      const formData = crearFormData({ logo_url: LOGO_URL, color_primario: colorProhibido });

      const resultado = await actualizarIdentidadVisual(ESTADO_ACTUALIZAR_IDENTIDAD_VISUAL_INICIAL, formData);

      expect(resultado).toEqual({ error: "NX-SYS-006", exito: false });
      expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
    },
  );

  it("rechaza con NX-SYS-006 si logo_url no es una URL válida", async () => {
    const formData = crearFormData({ logo_url: "no-es-una-url", color_primario: COLOR_PERMITIDO });

    const resultado = await actualizarIdentidadVisual(ESTADO_ACTUALIZAR_IDENTIDAD_VISUAL_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-006", exito: false });
  });

  it("rechaza sin sesión activa con NX-SYS-002", async () => {
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(mockearSesion(null) as never);

    const resultado = await actualizarIdentidadVisual(
      ESTADO_ACTUALIZAR_IDENTIDAD_VISUAL_INICIAL,
      crearFormData({ logo_url: LOGO_URL, color_primario: COLOR_PERMITIDO }),
    );

    expect(resultado).toEqual({ error: "NX-SYS-002", exito: false });
  });

  it("rechaza por falta de permisos (NX-SYS-003) cuando el solicitante es empleado", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "empleado", cliente_id: CLIENTE_ID }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await actualizarIdentidadVisual(
      ESTADO_ACTUALIZAR_IDENTIDAD_VISUAL_INICIAL,
      crearFormData({ logo_url: LOGO_URL, color_primario: COLOR_PERMITIDO }),
    );

    expect(resultado).toEqual({ error: "NX-SYS-003", exito: false });
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("guarda un color permitido de la paleta correctamente", async () => {
    const clienteActualizado = { cliente_id: CLIENTE_ID, logo_url: LOGO_URL, color_primario: COLOR_PERMITIDO };
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      rpc: vi.fn(async () => ({ data: clienteActualizado, error: null })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await actualizarIdentidadVisual(
      ESTADO_ACTUALIZAR_IDENTIDAD_VISUAL_INICIAL,
      crearFormData({ logo_url: LOGO_URL, color_primario: COLOR_PERMITIDO }),
    );

    expect(resultado).toEqual({ error: null, exito: true });
    expect(supabaseMock.rpc).toHaveBeenCalledWith("fn_actualizar_identidad_visual", {
      p_logo_url: LOGO_URL,
      p_color_primario: COLOR_PERMITIDO,
    });
  });

  it("permite limpiar el logo enviando una cadena vacía (se guarda como null)", async () => {
    const clienteActualizado = { cliente_id: CLIENTE_ID, logo_url: null, color_primario: COLOR_PERMITIDO };
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      rpc: vi.fn(async () => ({ data: clienteActualizado, error: null })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    await actualizarIdentidadVisual(
      ESTADO_ACTUALIZAR_IDENTIDAD_VISUAL_INICIAL,
      crearFormData({ logo_url: "", color_primario: COLOR_PERMITIDO }),
    );

    expect(supabaseMock.rpc).toHaveBeenCalledWith("fn_actualizar_identidad_visual", {
      p_logo_url: null,
      p_color_primario: COLOR_PERMITIDO,
    });
  });

  it("solo actualiza logo_url/color_primario: no envía ninguna otra columna al RPC", async () => {
    const clienteActualizado = { cliente_id: CLIENTE_ID, logo_url: LOGO_URL, color_primario: COLOR_PERMITIDO };
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      rpc: vi.fn(async () => ({ data: clienteActualizado, error: null })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    await actualizarIdentidadVisual(
      ESTADO_ACTUALIZAR_IDENTIDAD_VISUAL_INICIAL,
      crearFormData({ logo_url: LOGO_URL, color_primario: COLOR_PERMITIDO }),
    );

    const argumentosRpc = supabaseMock.rpc.mock.calls[0]?.[1];
    expect(Object.keys(argumentosRpc)).toEqual(["p_logo_url", "p_color_primario"]);
  });

  it("registra un diff por cada campo modificado con el valor anterior real", async () => {
    const clienteActualizado = { cliente_id: CLIENTE_ID, logo_url: LOGO_URL, color_primario: COLOR_PERMITIDO };
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      valoresPrevios: { data: { logo_url: null, color_primario: "#EF4444" }, error: null },
      rpc: vi.fn(async () => ({ data: clienteActualizado, error: null })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    await actualizarIdentidadVisual(
      ESTADO_ACTUALIZAR_IDENTIDAD_VISUAL_INICIAL,
      crearFormData({ logo_url: LOGO_URL, color_primario: COLOR_PERMITIDO }),
    );

    expect(registrarDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: CLIENTE_ID,
        usuarioId: USUARIO_ID,
        tablaAfectada: "clientes",
        registroId: CLIENTE_ID,
        campoModificado: "logo_url",
        valorAnterior: null,
        valorNuevo: LOGO_URL,
      }),
    );
    expect(registrarDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        campoModificado: "color_primario",
        valorAnterior: "#EF4444",
        valorNuevo: COLOR_PERMITIDO,
      }),
    );
  });

  it("retorna NX-SYS-007 cuando el RPC no encuentra el comercio del solicitante (NO_DATA_FOUND)", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      rpc: vi.fn(async () => ({ data: null, error: { code: "P0002", message: "..." } })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await actualizarIdentidadVisual(
      ESTADO_ACTUALIZAR_IDENTIDAD_VISUAL_INICIAL,
      crearFormData({ logo_url: LOGO_URL, color_primario: COLOR_PERMITIDO }),
    );

    expect(resultado).toEqual({ error: "NX-SYS-007", exito: false });
    expect(registrarDiff).not.toHaveBeenCalled();
  });

  it("retorna NX-SYS-001 ante cualquier otro error del RPC", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      rpc: vi.fn(async () => ({ data: null, error: { message: "fallo de conexión" } })),
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await actualizarIdentidadVisual(
      ESTADO_ACTUALIZAR_IDENTIDAD_VISUAL_INICIAL,
      crearFormData({ logo_url: LOGO_URL, color_primario: COLOR_PERMITIDO }),
    );

    expect(resultado).toEqual({ error: "NX-SYS-001", exito: false });
  });
});
