import { beforeEach, describe, expect, it, vi } from "vitest";

import { crearClienteSupabaseAdmin, crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { registrarDiffAuditoria } from "@/repositories/auditoria";

import { crearUsuario } from "./crearUsuario";
import { ESTADO_CREAR_USUARIO_INICIAL } from "./tipos";

vi.mock("next/server", () => ({
  after: vi.fn((callback: () => unknown) => callback()),
}));

vi.mock("@/lib/supabase/server", () => ({
  crearClienteSupabaseServidor: vi.fn(),
  crearClienteSupabaseAdmin: vi.fn(),
}));

vi.mock("@/repositories/auditoria", () => ({
  registrarDiffAuditoria: vi.fn(async () => undefined),
}));

interface ResultadoSupabase {
  data: unknown;
  error: unknown;
}

function crearQueryBuilder(resultado: ResultadoSupabase) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    single: vi.fn(async () => resultado),
  };
  return builder;
}

function crearFormData(campos: Record<string, string>): FormData {
  const formData = new FormData();
  Object.entries(campos).forEach(([clave, valor]) => formData.set(clave, valor));
  return formData;
}

const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
const CLIENTE_ID_SOLICITANTE = "a1111111-1111-4111-8111-111111111111";

function mockearSesion(usuario: { id: string } | null) {
  return { auth: { getUser: vi.fn(async () => ({ data: { user: usuario } })) } };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("crearUsuario", () => {
  it("rechaza un rol fuera de comerciante/empleado con NX-SYS-006 sin consultar Supabase", async () => {
    const formData = crearFormData({ nombre: "Ana Torres", email: "ana@comercio.com", rol: "admin_nodexa" });

    const resultado = await crearUsuario(ESTADO_CREAR_USUARIO_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-006", exito: false });
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("rechaza sin sesión activa con NX-SYS-002", async () => {
    const supabaseMock = mockearSesion(null);
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const formData = crearFormData({ nombre: "Ana Torres", email: "ana@comercio.com", rol: "empleado" });
    const resultado = await crearUsuario(ESTADO_CREAR_USUARIO_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-002", exito: false });
  });

  it("rechaza por falta de permisos (NX-SYS-003) cuando el solicitante no es comerciante", async () => {
    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn(() =>
        crearQueryBuilder({
          data: { usuario_id: "u-empleado", rol: "empleado", cliente_id: CLIENTE_ID_SOLICITANTE },
          error: null,
        }),
      ),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    const adminMock = { auth: { admin: { inviteUserByEmail: vi.fn(), deleteUser: vi.fn() } } };
    vi.mocked(crearClienteSupabaseAdmin).mockReturnValue(adminMock as never);

    const formData = crearFormData({ nombre: "Nuevo Empleado", email: "nuevo@comercio.com", rol: "empleado" });
    const resultado = await crearUsuario(ESTADO_CREAR_USUARIO_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-003", exito: false });
    expect(adminMock.auth.admin.inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("da de alta al empleado en el tenant del comerciante y registra la auditoría de forma asíncrona", async () => {
    const solicitanteBuilder = crearQueryBuilder({
      data: { usuario_id: "u-comerciante", rol: "comerciante", cliente_id: CLIENTE_ID_SOLICITANTE },
      error: null,
    });
    const insertBuilder = crearQueryBuilder({ data: { usuario_id: "u-nuevo-empleado" }, error: null });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn().mockReturnValueOnce(solicitanteBuilder).mockReturnValueOnce(insertBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const nuevoAuthUserId = "22222222-2222-4222-8222-222222222222";
    const adminMock = {
      auth: {
        admin: {
          inviteUserByEmail: vi.fn(async () => ({ data: { user: { id: nuevoAuthUserId } }, error: null })),
          deleteUser: vi.fn(),
        },
      },
    };
    vi.mocked(crearClienteSupabaseAdmin).mockReturnValue(adminMock as never);

    const formData = crearFormData({ nombre: "Nuevo Empleado", email: "nuevo@comercio.com", rol: "empleado" });
    const resultado = await crearUsuario(ESTADO_CREAR_USUARIO_INICIAL, formData);

    expect(resultado).toEqual({ error: null, exito: true });

    // El auth_user_id insertado es el que devolvió el alta en Auth, y el
    // cliente_id es el del comerciante solicitante (nunca uno enviado por el cliente).
    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        auth_user_id: nuevoAuthUserId,
        cliente_id: CLIENTE_ID_SOLICITANTE,
        rol: "empleado",
        nombre: "Nuevo Empleado",
        email: "nuevo@comercio.com",
      }),
    );
    expect(adminMock.auth.admin.deleteUser).not.toHaveBeenCalled();

    expect(registrarDiffAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: CLIENTE_ID_SOLICITANTE,
        usuarioId: "u-comerciante",
        tablaAfectada: "usuarios",
        registroId: "u-nuevo-empleado",
        campoModificado: "alta",
      }),
    );
  });

  it("revierte el alta en Auth si la inserción en `usuarios` falla, para no dejar un usuario huérfano", async () => {
    const solicitanteBuilder = crearQueryBuilder({
      data: { usuario_id: "u-comerciante", rol: "comerciante", cliente_id: CLIENTE_ID_SOLICITANTE },
      error: null,
    });
    const insertBuilder = crearQueryBuilder({ data: null, error: { message: "fallo de inserción" } });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn().mockReturnValueOnce(solicitanteBuilder).mockReturnValueOnce(insertBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const nuevoAuthUserId = "33333333-3333-4333-8333-333333333333";
    const adminMock = {
      auth: {
        admin: {
          inviteUserByEmail: vi.fn(async () => ({ data: { user: { id: nuevoAuthUserId } }, error: null })),
          deleteUser: vi.fn(async () => ({ data: null, error: null })),
        },
      },
    };
    vi.mocked(crearClienteSupabaseAdmin).mockReturnValue(adminMock as never);

    const formData = crearFormData({ nombre: "Nuevo Empleado", email: "nuevo@comercio.com", rol: "empleado" });
    const resultado = await crearUsuario(ESTADO_CREAR_USUARIO_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-001", exito: false });
    expect(adminMock.auth.admin.deleteUser).toHaveBeenCalledWith(nuevoAuthUserId);
    expect(registrarDiffAuditoria).not.toHaveBeenCalled();
  });
});
