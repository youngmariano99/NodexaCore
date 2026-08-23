import { beforeEach, describe, expect, it, vi } from "vitest";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

import { actualizarModuloCliente } from "./actualizarModuloCliente";

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

function crearBuilder(solicitanteRes: any, maybeSingleRes: any, upsertError: any) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    single: vi.fn(async () => ({ data: solicitanteRes, error: null })),
    maybeSingle: vi.fn(async () => maybeSingleRes),
    upsert: vi.fn(async () => ({ error: upsertError })),
  };
  return builder;
}

const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
const CLIENTE_ID = "a1111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("actualizarModuloCliente", () => {
  it("rechaza clienteId inválido con NX-SYS-006 sin consultar Supabase", async () => {
    const resultado = await actualizarModuloCliente("invalido", "fiados", true);
    expect(resultado).toEqual({ ok: false, error: "NX-SYS-006" });
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("actualiza modulo exitosamente cuando el solicitante es admin_nodexa", async () => {
    const supabaseMock = {
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: AUTH_USER_ID } } })) },
      from: vi.fn((tabla: string) => {
        if (tabla === "usuarios") {
          return crearBuilder({ usuario_id: "admin-id", rol: "admin_nodexa" }, null as never, null);
        }
        if (tabla === "tenant_modules") {
          return crearBuilder(null as never, { data: { activo: false }, error: null }, null);
        }
        throw new Error("Tabla no mockeada");
      }),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await actualizarModuloCliente(CLIENTE_ID, "fiados", true);

    expect(resultado).toEqual({ ok: true, data: { modulo: "fiados", activo: true } });
    expect(registrarDiff).toHaveBeenCalled();
  });

  it("rechaza si el solicitante no es admin_nodexa con NX-SYS-003", async () => {
    const supabaseMock = {
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: AUTH_USER_ID } } })) },
      from: vi.fn((tabla: string) => {
        if (tabla === "usuarios") {
          return crearBuilder({ usuario_id: "comerciante-id", rol: "comerciante" }, null as never, null);
        }
        throw new Error("Tabla no mockeada");
      }),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await actualizarModuloCliente(CLIENTE_ID, "fiados", true);

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-003" });
  });
});
