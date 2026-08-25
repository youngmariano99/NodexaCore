import { beforeEach, describe, expect, it, vi } from "vitest";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { contarMarcasActivas, insertarMarca } from "@/repositories/marcasRepository";

import { crearMarca } from "./crearMarca";
import { ESTADO_CREAR_MARCA_INICIAL } from "./tipos";

vi.mock("@/lib/supabase/server", () => ({
  crearClienteSupabaseServidor: vi.fn(),
}));

vi.mock("@/lib/auditoria/registrarDiff", () => ({
  registrarDiff: vi.fn(),
}));

vi.mock("@/repositories/marcasRepository", () => ({
  contarMarcasActivas: vi.fn(),
  insertarMarca: vi.fn(),
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

const DATOS_VALIDOS = { nombre: "Coca-Cola" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("crearMarca", () => {
  it("rechaza un nombre vacío con NX-SYS-006", async () => {
    const formData = crearFormData({ nombre: "" });

    const resultado = await crearMarca(ESTADO_CREAR_MARCA_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-006", exito: false });
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("rechaza sin sesión activa con NX-SYS-002", async () => {
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(mockearSesion(null) as never);

    const resultado = await crearMarca(ESTADO_CREAR_MARCA_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-SYS-002", exito: false });
  });

  it("rechaza por falta de permisos (NX-SYS-003) cuando el solicitante es admin_nodexa", async () => {
    const solicitanteBuilder = crearBuilder({
      data: { usuario_id: "u-admin", rol: "admin_nodexa", cliente_id: null },
      error: null,
    });
    const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: vi.fn(() => solicitanteBuilder) };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await crearMarca(ESTADO_CREAR_MARCA_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-SYS-003", exito: false });
    expect(contarMarcasActivas).not.toHaveBeenCalled();
  });

  it("retorna NX-BRD-001 sin insertar cuando el conteo de marcas activas ya alcanzó el límite", async () => {
    const solicitanteBuilder = crearBuilder({
      data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID },
      error: null,
    });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn().mockReturnValueOnce(solicitanteBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    vi.mocked(contarMarcasActivas).mockResolvedValue({ ok: true, data: 50 });

    const resultado = await crearMarca(ESTADO_CREAR_MARCA_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-BRD-001", exito: false });
    expect(insertarMarca).not.toHaveBeenCalled();
  });

  it("da de alta la marca y registra la auditoría de forma asíncrona sin bloquear la respuesta", async () => {
    const solicitanteBuilder = crearBuilder({
      data: { usuario_id: USUARIO_ID, rol: "empleado", cliente_id: CLIENTE_ID },
      error: null,
    });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn().mockReturnValueOnce(solicitanteBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    vi.mocked(contarMarcasActivas).mockResolvedValue({ ok: true, data: 12 });
    vi.mocked(insertarMarca).mockResolvedValue({
      ok: true,
      data: { marca_id: "m-nueva", cliente_id: CLIENTE_ID, nombre: "Coca-Cola", creado_en: "now", eliminado_en: null },
    });

    const resultado = await crearMarca(ESTADO_CREAR_MARCA_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: null, exito: true });
    expect(insertarMarca).toHaveBeenCalledWith(expect.anything(), {
      clienteId: CLIENTE_ID,
      nombre: "Coca-Cola",
    });
    expect(registrarDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: CLIENTE_ID,
        usuarioId: USUARIO_ID,
        tablaAfectada: "marcas",
        registroId: "m-nueva",
        campoModificado: "alta",
      }),
    );
  });
});
