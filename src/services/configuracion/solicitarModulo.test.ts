import { beforeEach, describe, expect, it, vi } from "vitest";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

import { solicitarModulo } from "./solicitarModulo";

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

function crearBuilder(solicitanteRes: any) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    single: vi.fn(async () => ({ data: solicitanteRes, error: null })),
  };
  return builder;
}

const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
const CLIENTE_ID = "a1111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("solicitarModulo", () => {
  it("registra la solicitud exitosamente cuando el solicitante es comerciante", async () => {
    const supabaseMock = {
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: AUTH_USER_ID } } })) },
      from: vi.fn((tabla: string) => {
        if (tabla === "usuarios") {
          return crearBuilder({ usuario_id: "comerciante-id", rol: "comerciante", cliente_id: CLIENTE_ID });
        }
        throw new Error("Tabla no mockeada");
      }),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await solicitarModulo("fiados");

    expect(resultado).toEqual({ ok: true, data: { modulo: "fiados" } });
    expect(registrarDiff).toHaveBeenCalledWith({
      clienteId: CLIENTE_ID,
      usuarioId: "comerciante-id",
      tablaAfectada: "tenant_modules",
      registroId: CLIENTE_ID,
      campoModificado: "solicitud_activacion",
      valorAnterior: "no_contratado",
      valorNuevo: "fiados",
    });
  });

  it("rechaza si el solicitante es admin_nodexa con NX-SYS-003", async () => {
    const supabaseMock = {
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: AUTH_USER_ID } } })) },
      from: vi.fn((tabla: string) => {
        if (tabla === "usuarios") {
          return crearBuilder({ usuario_id: "admin-id", rol: "admin_nodexa", cliente_id: null });
        }
        throw new Error("Tabla no mockeada");
      }),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await solicitarModulo("fiados");

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-003" });
  });
});
