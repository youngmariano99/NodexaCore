import { beforeEach, describe, expect, it, vi } from "vitest";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

import { actualizarConfiguracionBot } from "./actualizarConfiguracionBot";
import { ESTADO_ACTUALIZAR_CONFIGURACION_BOT_INICIAL } from "./tipos";

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
    upsert: vi.fn(() => builder),
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
  moduloBot?: ResultadoSupabase;
  valoresPrevios?: ResultadoSupabase;
  upsert?: ResultadoSupabase;
}) {
  const solicitanteBuilder = crearBuilderSingle(opciones.solicitante);
  const moduloBuilder = crearBuilderSingle(opciones.moduloBot ?? { data: { activo: true }, error: null });
  const previosBuilder = crearBuilderSingle(
    opciones.valoresPrevios ?? {
      data: { activo: false, mensaje_horarios: null, mensaje_ubicacion: null, mensaje_catalogo: null },
      error: null,
    },
  );
  const upsertBuilder = crearBuilderSingle(
    opciones.upsert ?? {
      data: {
        cliente_id: CLIENTE_ID,
        activo: true,
        mensaje_horarios: "Lunes a sábado de 8 a 20 hs.",
        mensaje_ubicacion: null,
        mensaje_catalogo: null,
      },
      error: null,
    },
  );

  let llamadasATabla = 0;

  const from = vi.fn((tabla: string) => {
    if (tabla === "usuarios") return solicitanteBuilder;
    if (tabla === "tenant_modules") return moduloBuilder;
    if (tabla === "configuracion_bot_whatsapp") {
      llamadasATabla += 1;
      return llamadasATabla === 1 ? previosBuilder : upsertBuilder;
    }
    throw new Error(`tabla no mockeada en el test: ${tabla}`);
  });

  return { ...mockearSesion({ id: AUTH_USER_ID }), from };
}

function crearFormData(campos: {
  activo?: string;
  mensaje_horarios?: string;
  mensaje_ubicacion?: string;
  mensaje_catalogo?: string;
}): FormData {
  const formData = new FormData();
  if (campos.activo !== undefined) formData.set("activo", campos.activo);
  if (campos.mensaje_horarios !== undefined) formData.set("mensaje_horarios", campos.mensaje_horarios);
  if (campos.mensaje_ubicacion !== undefined) formData.set("mensaje_ubicacion", campos.mensaje_ubicacion);
  if (campos.mensaje_catalogo !== undefined) formData.set("mensaje_catalogo", campos.mensaje_catalogo);
  return formData;
}

const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
const CLIENTE_ID = "b2222222-2222-4222-8222-222222222222";
const USUARIO_ID = "u-comerciante";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("actualizarConfiguracionBot", () => {
  it("rechaza con NX-BOT-002 al activar el bot sin ningún mensaje configurado, sin consultar Supabase", async () => {
    const formData = crearFormData({ activo: "true" });

    const resultado = await actualizarConfiguracionBot(ESTADO_ACTUALIZAR_CONFIGURACION_BOT_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-BOT-002", exito: false });
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("acepta activo=true con un único mensaje no vacío (los otros dos ausentes)", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await actualizarConfiguracionBot(
      ESTADO_ACTUALIZAR_CONFIGURACION_BOT_INICIAL,
      crearFormData({ activo: "true", mensaje_horarios: "Lunes a sábado de 8 a 20 hs." }),
    );

    expect(resultado).toEqual({ error: null, exito: true });
  });

  it("permite activo=false sin ningún mensaje configurado", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      upsert: {
        data: {
          cliente_id: CLIENTE_ID,
          activo: false,
          mensaje_horarios: null,
          mensaje_ubicacion: null,
          mensaje_catalogo: null,
        },
        error: null,
      },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await actualizarConfiguracionBot(
      ESTADO_ACTUALIZAR_CONFIGURACION_BOT_INICIAL,
      crearFormData({ activo: "false" }),
    );

    expect(resultado).toEqual({ error: null, exito: true });
  });

  it("rechaza sin sesión activa con NX-SYS-002", async () => {
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(mockearSesion(null) as never);

    const resultado = await actualizarConfiguracionBot(
      ESTADO_ACTUALIZAR_CONFIGURACION_BOT_INICIAL,
      crearFormData({ activo: "true", mensaje_horarios: "Lunes a viernes" }),
    );

    expect(resultado).toEqual({ error: "NX-SYS-002", exito: false });
  });

  it("rechaza por falta de permisos (NX-SYS-003) cuando el solicitante es empleado", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "empleado", cliente_id: CLIENTE_ID }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await actualizarConfiguracionBot(
      ESTADO_ACTUALIZAR_CONFIGURACION_BOT_INICIAL,
      crearFormData({ activo: "true", mensaje_horarios: "Lunes a viernes" }),
    );

    expect(resultado).toEqual({ error: "NX-SYS-003", exito: false });
  });

  it("rechaza con NX-BOT-001 cuando el módulo bot_whatsapp no está activo", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      moduloBot: { data: { activo: false }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await actualizarConfiguracionBot(
      ESTADO_ACTUALIZAR_CONFIGURACION_BOT_INICIAL,
      crearFormData({ activo: "true", mensaje_horarios: "Lunes a viernes" }),
    );

    expect(resultado).toEqual({ error: "NX-BOT-001", exito: false });
  });

  it("rechaza con NX-BOT-001 cuando el tenant nunca contrató el módulo (sin fila en tenant_modules)", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      moduloBot: { data: null, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await actualizarConfiguracionBot(
      ESTADO_ACTUALIZAR_CONFIGURACION_BOT_INICIAL,
      crearFormData({ activo: "true", mensaje_horarios: "Lunes a viernes" }),
    );

    expect(resultado).toEqual({ error: "NX-BOT-001", exito: false });
  });

  it("hace upsert sobre configuracion_bot_whatsapp usando cliente_id como conflicto", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    await actualizarConfiguracionBot(
      ESTADO_ACTUALIZAR_CONFIGURACION_BOT_INICIAL,
      crearFormData({ activo: "true", mensaje_horarios: "Lunes a sábado de 8 a 20 hs." }),
    );

    const llamadaUpsert = supabaseMock.from.mock.results
      .map((resultado) => resultado.value)
      .find((builder) => builder.upsert.mock.calls.length > 0);

    expect(llamadaUpsert.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        cliente_id: CLIENTE_ID,
        activo: true,
        mensaje_horarios: "Lunes a sábado de 8 a 20 hs.",
        mensaje_ubicacion: null,
        mensaje_catalogo: null,
      }),
      { onConflict: "cliente_id" },
    );
  });

  it("registra un diff solo por los campos que cambiaron", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      valoresPrevios: {
        data: {
          activo: false,
          mensaje_horarios: null,
          mensaje_ubicacion: "Belgrano 120",
          mensaje_catalogo: null,
        },
        error: null,
      },
      upsert: {
        data: {
          cliente_id: CLIENTE_ID,
          activo: true,
          mensaje_horarios: "Lunes a sábado de 8 a 20 hs.",
          mensaje_ubicacion: "Belgrano 120",
          mensaje_catalogo: null,
        },
        error: null,
      },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    await actualizarConfiguracionBot(
      ESTADO_ACTUALIZAR_CONFIGURACION_BOT_INICIAL,
      crearFormData({
        activo: "true",
        mensaje_horarios: "Lunes a sábado de 8 a 20 hs.",
        mensaje_ubicacion: "Belgrano 120",
      }),
    );

    expect(registrarDiff).toHaveBeenCalledWith(
      expect.objectContaining({ campoModificado: "activo", valorAnterior: "false", valorNuevo: "true" }),
    );
    expect(registrarDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        campoModificado: "mensaje_horarios",
        valorAnterior: null,
        valorNuevo: "Lunes a sábado de 8 a 20 hs.",
      }),
    );
    expect(registrarDiff).not.toHaveBeenCalledWith(
      expect.objectContaining({ campoModificado: "mensaje_ubicacion" }),
    );
  });

  it("retorna NX-SYS-001 ante un fallo del upsert", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      upsert: { data: null, error: { message: "fallo de conexión" } },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await actualizarConfiguracionBot(
      ESTADO_ACTUALIZAR_CONFIGURACION_BOT_INICIAL,
      crearFormData({ activo: "true", mensaje_horarios: "Lunes a sábado de 8 a 20 hs." }),
    );

    expect(resultado).toEqual({ error: "NX-SYS-001", exito: false });
    expect(registrarDiff).not.toHaveBeenCalled();
  });
});
