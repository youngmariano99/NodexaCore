import { beforeEach, describe, expect, it, vi } from "vitest";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { insertarClienteFinal } from "@/repositories/clientesFinales";

import { crearClienteFinal } from "./crearClienteFinal";
import { ESTADO_CREAR_CLIENTE_FINAL_INICIAL } from "./tipos";

vi.mock("@/lib/supabase/server", () => ({
  crearClienteSupabaseServidor: vi.fn(),
}));

vi.mock("@/lib/auditoria/registrarDiff", () => ({
  registrarDiff: vi.fn(),
}));

vi.mock("@/repositories/clientesFinales", () => ({
  insertarClienteFinal: vi.fn(),
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
    single: vi.fn(async () => resultado),
  };
  return builder;
}

function crearBuilderMaybeSingle(resultado: ResultadoSupabase) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => resultado),
  };
  return builder;
}

function mockearSesion(usuario: { id: string } | null) {
  return { auth: { getUser: vi.fn(async () => ({ data: { user: usuario } })) } };
}

function mockearSupabaseCompleto(opciones: { solicitante: ResultadoSupabase; modulo?: ResultadoSupabase }) {
  const solicitanteBuilder = crearBuilderSingle(opciones.solicitante);
  const moduloBuilder = crearBuilderMaybeSingle(opciones.modulo ?? { data: { activo: true }, error: null });

  const from = vi.fn((tabla: string) => {
    if (tabla === "usuarios") return solicitanteBuilder;
    if (tabla === "tenant_modules") return moduloBuilder;
    throw new Error(`tabla no mockeada en el test: ${tabla}`);
  });

  return { ...mockearSesion({ id: AUTH_USER_ID }), from };
}

function crearFormData(campos: Record<string, string>): FormData {
  const formData = new FormData();
  Object.entries(campos).forEach(([clave, valor]) => formData.set(clave, valor));
  return formData;
}

const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
const CLIENTE_ID = "a1111111-1111-4111-8111-111111111111";
const USUARIO_ID = "u-comerciante";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("crearClienteFinal", () => {
  it("rechaza sin nombre con NX-SYS-006, sin consultar Supabase", async () => {
    const resultado = await crearClienteFinal(ESTADO_CREAR_CLIENTE_FINAL_INICIAL, crearFormData({ telefono: "+5492920001111" }));

    expect(resultado).toEqual({ error: "NX-SYS-006", exito: false });
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("rechaza sin sesión activa con NX-SYS-002", async () => {
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(mockearSesion(null) as never);

    const resultado = await crearClienteFinal(ESTADO_CREAR_CLIENTE_FINAL_INICIAL, crearFormData({ nombre: "Juan Pérez" }));

    expect(resultado).toEqual({ error: "NX-SYS-002", exito: false });
  });

  it("rechaza por falta de permisos (NX-SYS-003) si el solicitante es admin_nodexa", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "admin_nodexa", cliente_id: null }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await crearClienteFinal(ESTADO_CREAR_CLIENTE_FINAL_INICIAL, crearFormData({ nombre: "Juan Pérez" }));

    expect(resultado).toEqual({ error: "NX-SYS-003", exito: false });
  });

  it("retorna NX-FIA-001 si el módulo fiados no está activo en el tenant, sin intentar el insert", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      modulo: { data: { activo: false }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await crearClienteFinal(ESTADO_CREAR_CLIENTE_FINAL_INICIAL, crearFormData({ nombre: "Juan Pérez" }));

    expect(resultado).toEqual({ error: "NX-FIA-001", exito: false });
    expect(insertarClienteFinal).not.toHaveBeenCalled();
  });

  it("retorna NX-FIA-001 si el tenant no tiene fila en tenant_modules para fiados", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      modulo: { data: null, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await crearClienteFinal(ESTADO_CREAR_CLIENTE_FINAL_INICIAL, crearFormData({ nombre: "Juan Pérez" }));

    expect(resultado).toEqual({ error: "NX-FIA-001", exito: false });
  });

  it("da de alta el cliente final con telefono normalizado a NULL cuando llega vacío, y registra la auditoría", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    vi.mocked(insertarClienteFinal).mockResolvedValue({
      ok: true,
      data: { cliente_final_id: "cf-1", cliente_id: CLIENTE_ID, nombre: "Juan Pérez", telefono: null, saldo_deudor: 0 },
    });

    const resultado = await crearClienteFinal(
      ESTADO_CREAR_CLIENTE_FINAL_INICIAL,
      crearFormData({ nombre: "Juan Pérez", telefono: "" }),
    );

    expect(resultado).toEqual({ error: null, exito: true });
    expect(insertarClienteFinal).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ clienteId: CLIENTE_ID, nombre: "Juan Pérez", telefono: null }),
    );
    expect(registrarDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: CLIENTE_ID,
        usuarioId: USUARIO_ID,
        tablaAfectada: "clientes_finales",
        registroId: "cf-1",
        campoModificado: "alta",
      }),
    );
  });

  it("permite el alta a un empleado (docs/ROLES.md §2: C también para empleado)", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "empleado", cliente_id: CLIENTE_ID }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    vi.mocked(insertarClienteFinal).mockResolvedValue({
      ok: true,
      data: { cliente_final_id: "cf-2", cliente_id: CLIENTE_ID, nombre: "María López", telefono: "+5492920002222", saldo_deudor: 0 },
    });

    const resultado = await crearClienteFinal(
      ESTADO_CREAR_CLIENTE_FINAL_INICIAL,
      crearFormData({ nombre: "María López", telefono: "+5492920002222" }),
    );

    expect(resultado).toEqual({ error: null, exito: true });
  });

  it("retorna NX-FIA-005 ante datos de contacto duplicados, sin registrar auditoría", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    vi.mocked(insertarClienteFinal).mockResolvedValue({ ok: false, error: "NX-FIA-005" });

    const resultado = await crearClienteFinal(
      ESTADO_CREAR_CLIENTE_FINAL_INICIAL,
      crearFormData({ nombre: "Juan Pérez", telefono: "+5492920001111" }),
    );

    expect(resultado).toEqual({ error: "NX-FIA-005", exito: false });
    expect(registrarDiff).not.toHaveBeenCalled();
  });
});
