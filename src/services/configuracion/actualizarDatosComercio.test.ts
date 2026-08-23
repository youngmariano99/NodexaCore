import { beforeEach, describe, expect, it, vi } from "vitest";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

import { actualizarDatosComercio } from "./actualizarDatosComercio";

vi.mock("@/lib/supabase/server", () => ({
  crearClienteSupabaseServidor: vi.fn(),
}));

vi.mock("@/lib/auditoria/registrarDiff", () => ({
  registrarDiff: vi.fn(),
}));

function crearBuilder(solicitanteRes: unknown, clienteRes: unknown, updateError: unknown) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    update: vi.fn(() => builder),
    single: vi.fn(async () => ({ data: solicitanteRes, error: null })),
    maybeSingle: vi.fn(async () => ({ data: clienteRes, error: null })),
    error: updateError,
  };
  return builder;
}

const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
const CLIENTE_ID = "a1111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("actualizarDatosComercio", () => {
  it("rechaza datos inválidos con NX-SYS-006 sin consultar Supabase", async () => {
    const resultado = await actualizarDatosComercio("", "123", "no-es-url");
    expect(resultado).toEqual({ ok: false, error: "NX-SYS-006" });
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("actualiza datos exitosamente cuando el solicitante es comerciante", async () => {
    const supabaseMock = {
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: AUTH_USER_ID } } })) },
      from: vi.fn((tabla: string) => {
        if (tabla === "usuarios") {
          return crearBuilder(
            { usuario_id: "comerciante-id", rol: "comerciante", cliente_id: CLIENTE_ID },
            null,
            null
          );
        }
        if (tabla === "clientes") {
          return crearBuilder(
            null,
            { nombre_comercio: "Mi Tienda", telefono_whatsapp: "54911223344", logo_url: null },
            null
          );
        }
        throw new Error("Tabla no mockeada");
      }),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await actualizarDatosComercio("Mi Tienda Editada", "5491122334455", "https://logo.com/logo.png");

    expect(resultado).toEqual({
      ok: true,
      data: {
        nombreComercio: "Mi Tienda Editada",
        telefonoWhatsapp: "5491122334455",
        logoUrl: "https://logo.com/logo.png",
      },
    });
    expect(registrarDiff).toHaveBeenCalled();
  });

  it("rechaza si el solicitante es empleado con NX-SYS-003", async () => {
    const supabaseMock = {
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: AUTH_USER_ID } } })) },
      from: vi.fn((tabla: string) => {
        if (tabla === "usuarios") {
          return crearBuilder(
            { usuario_id: "empleado-id", rol: "empleado", cliente_id: CLIENTE_ID },
            null,
            null
          );
        }
        throw new Error("Tabla no mockeada");
      }),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await actualizarDatosComercio("Tienda", "54911223344", null);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-003" });
  });
});
