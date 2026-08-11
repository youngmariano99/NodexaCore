import * as Sentry from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { obtenerConfiguracionBotPublica } from "./configuracionBotRepository";

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
}));

interface ResultadoSupabase {
  data: unknown;
  error: unknown;
}

function crearBuilderSingle(resultado: ResultadoSupabase) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => resultado),
  };
  return builder;
}

function mockearSupabase(opciones: { modulo: ResultadoSupabase; configuracion?: ResultadoSupabase }) {
  const moduloBuilder = crearBuilderSingle(opciones.modulo);
  const configuracionBuilder = crearBuilderSingle(
    opciones.configuracion ?? { data: null, error: null },
  );

  const from = vi.fn((tabla: string) => {
    if (tabla === "tenant_modules") return moduloBuilder;
    if (tabla === "configuracion_bot_whatsapp") return configuracionBuilder;
    throw new Error(`tabla no mockeada en el test: ${tabla}`);
  });

  return { from };
}

const CLIENTE_ID = "b2222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("obtenerConfiguracionBotPublica", () => {
  it("retorna null cuando el tenant no contrató el módulo bot_whatsapp (sin fila en tenant_modules)", async () => {
    const supabaseMock = mockearSupabase({ modulo: { data: null, error: null } });

    const resultado = await obtenerConfiguracionBotPublica(supabaseMock as never, CLIENTE_ID);

    expect(resultado).toBeNull();
  });

  it("retorna null cuando el módulo bot_whatsapp está desactivado", async () => {
    const supabaseMock = mockearSupabase({ modulo: { data: { activo: false }, error: null } });

    const resultado = await obtenerConfiguracionBotPublica(supabaseMock as never, CLIENTE_ID);

    expect(resultado).toBeNull();
  });

  it("retorna null cuando el módulo está activo pero configuracion_bot_whatsapp.activo es false (sin fila)", async () => {
    const supabaseMock = mockearSupabase({
      modulo: { data: { activo: true }, error: null },
      configuracion: { data: null, error: null },
    });

    const resultado = await obtenerConfiguracionBotPublica(supabaseMock as never, CLIENTE_ID);

    expect(resultado).toBeNull();
  });

  it("retorna la configuración pública cuando el módulo y el bot están activos", async () => {
    const supabaseMock = mockearSupabase({
      modulo: { data: { activo: true }, error: null },
      configuracion: {
        data: {
          activo: true,
          mensaje_horarios: "Lunes a sábado de 8 a 20 hs.",
          mensaje_ubicacion: "Belgrano 120",
          mensaje_catalogo: null,
          permite_derivar_whatsapp: true,
        },
        error: null,
      },
    });

    const resultado = await obtenerConfiguracionBotPublica(supabaseMock as never, CLIENTE_ID);

    expect(resultado).toEqual({
      mensaje_horarios: "Lunes a sábado de 8 a 20 hs.",
      mensaje_ubicacion: "Belgrano 120",
      mensaje_catalogo: null,
      permite_derivar_whatsapp: true,
    });
  });

  it("registra NX-BOT-003 y retorna null ante un error real al consultar tenant_modules", async () => {
    const supabaseMock = mockearSupabase({ modulo: { data: null, error: { message: "fallo de conexión" } } });

    const resultado = await obtenerConfiguracionBotPublica(supabaseMock as never, CLIENTE_ID);

    expect(resultado).toBeNull();
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ tags: expect.objectContaining({ codigo_error: "NX-BOT-003", tabla: "tenant_modules" }) }),
    );
  });

  it("registra NX-BOT-003 y retorna null ante un error real al consultar configuracion_bot_whatsapp", async () => {
    const supabaseMock = mockearSupabase({
      modulo: { data: { activo: true }, error: null },
      configuracion: { data: null, error: { message: "fallo de conexión" } },
    });

    const resultado = await obtenerConfiguracionBotPublica(supabaseMock as never, CLIENTE_ID);

    expect(resultado).toBeNull();
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        tags: expect.objectContaining({ codigo_error: "NX-BOT-003", tabla: "configuracion_bot_whatsapp" }),
      }),
    );
  });
});
