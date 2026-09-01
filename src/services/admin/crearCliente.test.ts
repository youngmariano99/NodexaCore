import { beforeEach, describe, expect, it, vi } from "vitest";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseAdmin, crearClienteSupabaseServidor } from "@/lib/supabase/server";

import { crearCliente } from "./crearCliente";
import { ESTADO_CREAR_CLIENTE_INICIAL } from "./tipos";

vi.mock("@/lib/supabase/server", () => ({
  crearClienteSupabaseServidor: vi.fn(),
  crearClienteSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/auditoria/registrarDiff", () => ({
  registrarDiff: vi.fn(),
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
const USUARIO_ID_ADMIN = "d0000000-0000-4000-8000-000000000001";

function mockearSesion(usuario: { id: string } | null) {
  return { auth: { getUser: vi.fn(async () => ({ data: { user: usuario } })) } };
}

const DATOS_VALIDOS = {
  nombre_comercio: "Almacén Don Pedro",
  slug: "almacen-don-pedro",
  telefono_whatsapp: "+5492920000001",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("crearCliente", () => {
  it("rechaza un slug con formato inválido con NX-SYS-006 sin consultar Supabase", async () => {
    const formData = crearFormData({ ...DATOS_VALIDOS, slug: "Almacén Don Pedro" });

    const resultado = await crearCliente(ESTADO_CREAR_CLIENTE_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-006", exito: false });
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("rechaza sin sesión activa con NX-SYS-002", async () => {
    const supabaseMock = mockearSesion(null);
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await crearCliente(ESTADO_CREAR_CLIENTE_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-SYS-002", exito: false });
  });

  it("rechaza por falta de permisos (NX-SYS-003) cuando el solicitante no es admin_nodexa", async () => {
    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn(() =>
        crearQueryBuilder({ data: { usuario_id: "u-comerciante", rol: "comerciante" }, error: null }),
      ),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    const adminMock = { from: vi.fn() };
    vi.mocked(crearClienteSupabaseAdmin).mockReturnValue(adminMock as never);

    const resultado = await crearCliente(ESTADO_CREAR_CLIENTE_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-SYS-003", exito: false });
    expect(adminMock.from).not.toHaveBeenCalled();
  });

  it("da de alta el comercio con estado_pago=true y limite_sku=1000, y registra la auditoría", async () => {
    const solicitanteBuilder = crearQueryBuilder({
      data: { usuario_id: USUARIO_ID_ADMIN, rol: "admin_nodexa" },
      error: null,
    });
    const insertBuilder = crearQueryBuilder({ data: { cliente_id: "c-nuevo-cliente" }, error: null });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn(() => solicitanteBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const adminMock = { from: vi.fn(() => insertBuilder) };
    vi.mocked(crearClienteSupabaseAdmin).mockReturnValue(adminMock as never);

    const resultado = await crearCliente(ESTADO_CREAR_CLIENTE_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: null, exito: true, clienteId: "c-nuevo-cliente" });

    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre_comercio: "Almacén Don Pedro",
        slug: "almacen-don-pedro",
        telefono_whatsapp: "+5492920000001",
        estado_pago: true,
        limite_sku: 1000,
        cuota_mensual_ia: 40,
        configuracion_plantilla: { modalidad_catalogo: "vidriera" },
      }),
    );

    expect(registrarDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: "c-nuevo-cliente",
        usuarioId: USUARIO_ID_ADMIN,
        tablaAfectada: "clientes",
        registroId: "c-nuevo-cliente",
        campoModificado: "alta",
      }),
    );
  });

  it("da de alta comercio y usuario dueño completo con módulos y configuración de catálogo", async () => {
    const solicitanteBuilder = crearQueryBuilder({
      data: { usuario_id: USUARIO_ID_ADMIN, rol: "admin_nodexa" },
      error: null,
    });
    const clienteInsertBuilder = crearQueryBuilder({ data: { cliente_id: "c-nuevo-cliente" }, error: null });
    const usuarioInsertBuilder = crearQueryBuilder({ data: { usuario_id: "u-nuevo-dueno" }, error: null });
    const modulosInsertBuilder = crearQueryBuilder({ data: null, error: null });
    const botInsertBuilder = crearQueryBuilder({ data: null, error: null });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn(() => solicitanteBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const createUserMock = vi.fn(async () => ({
      data: { user: { id: "auth-nuevo-dueno" } },
      error: null,
    }));

    const adminMock = {
      auth: {
        admin: {
          createUser: createUserMock,
          deleteUser: vi.fn(),
        },
      },
      from: vi.fn((tabla: string) => {
        if (tabla === "clientes") return clienteInsertBuilder;
        if (tabla === "usuarios") return usuarioInsertBuilder;
        if (tabla === "tenant_modules") return modulosInsertBuilder;
        if (tabla === "configuracion_bot_whatsapp") return botInsertBuilder;
        return crearQueryBuilder({ data: null, error: null });
      }),
    };
    vi.mocked(crearClienteSupabaseAdmin).mockReturnValue(adminMock as never);

    const formData = crearFormData({
      ...DATOS_VALIDOS,
      nombre_dueno: "Pedro Pérez",
      email: "pedro@almacen.com",
      password: "passwordSeguro123",
      modalidad_catalogo: "comandas_realtime",
      cuota_mensual_ia: "60",
      modulos: JSON.stringify(["catalogo_web", "bot_whatsapp"]),
    });

    const resultado = await crearCliente(ESTADO_CREAR_CLIENTE_INICIAL, formData);

    expect(resultado).toEqual({ error: null, exito: true, clienteId: "c-nuevo-cliente" });

    expect(createUserMock).toHaveBeenCalledWith({
      email: "pedro@almacen.com",
      password: "passwordSeguro123",
      email_confirm: true,
      user_metadata: { nombre: "Pedro Pérez" },
    });

    expect(clienteInsertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre_comercio: "Almacén Don Pedro",
        slug: "almacen-don-pedro",
        cuota_mensual_ia: 60,
        configuracion_plantilla: { modalidad_catalogo: "comandas_realtime" },
      }),
    );

    expect(usuarioInsertBuilder.insert).toHaveBeenCalledWith({
      auth_user_id: "auth-nuevo-dueno",
      cliente_id: "c-nuevo-cliente",
      rol: "comerciante",
      nombre: "Pedro Pérez",
      email: "pedro@almacen.com",
    });

    expect(botInsertBuilder.insert).toHaveBeenCalledWith({
      cliente_id: "c-nuevo-cliente",
      activo: true,
      permite_derivar_whatsapp: true,
    });
  });

  it("revierte el usuario en Auth si falla la inserción en clientes", async () => {
    const solicitanteBuilder = crearQueryBuilder({
      data: { usuario_id: USUARIO_ID_ADMIN, rol: "admin_nodexa" },
      error: null,
    });
    const clienteInsertBuilder = crearQueryBuilder({
      data: null,
      error: { code: "23505", message: "duplicate key" },
    });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn(() => solicitanteBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const deleteUserMock = vi.fn();
    const adminMock = {
      auth: {
        admin: {
          createUser: vi.fn(async () => ({ data: { user: { id: "auth-huerfano" } }, error: null })),
          deleteUser: deleteUserMock,
        },
      },
      from: vi.fn(() => clienteInsertBuilder),
    };
    vi.mocked(crearClienteSupabaseAdmin).mockReturnValue(adminMock as never);

    const formData = crearFormData({
      ...DATOS_VALIDOS,
      nombre_dueno: "Pedro Pérez",
      email: "pedro@almacen.com",
      password: "password123",
    });

    const resultado = await crearCliente(ESTADO_CREAR_CLIENTE_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-ADM-001", exito: false, clienteId: null });
    expect(deleteUserMock).toHaveBeenCalledWith("auth-huerfano");
  });

  it("revierte usuario en Auth y elimina cliente si falla la inserción en usuarios", async () => {
    const solicitanteBuilder = crearQueryBuilder({
      data: { usuario_id: USUARIO_ID_ADMIN, rol: "admin_nodexa" },
      error: null,
    });
    const clienteInsertBuilder = {
      ...crearQueryBuilder({ data: { cliente_id: "c-rollback-test" }, error: null }),
      delete: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
    };
    const usuarioInsertBuilder = crearQueryBuilder({
      data: null,
      error: { code: "500", message: "DB Error" },
    });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn(() => solicitanteBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const deleteUserMock = vi.fn();
    const adminMock = {
      auth: {
        admin: {
          createUser: vi.fn(async () => ({ data: { user: { id: "auth-rollback" } }, error: null })),
          deleteUser: deleteUserMock,
        },
      },
      from: vi.fn((tabla: string) => {
        if (tabla === "clientes") return clienteInsertBuilder;
        if (tabla === "usuarios") return usuarioInsertBuilder;
        return crearQueryBuilder({ data: null, error: null });
      }),
    };
    vi.mocked(crearClienteSupabaseAdmin).mockReturnValue(adminMock as never);

    const formData = crearFormData({
      ...DATOS_VALIDOS,
      nombre_dueno: "Pedro Pérez",
      email: "pedro@almacen.com",
      password: "password123",
    });

    const resultado = await crearCliente(ESTADO_CREAR_CLIENTE_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-001", exito: false, clienteId: null });
    expect(deleteUserMock).toHaveBeenCalledWith("auth-rollback");
    expect(clienteInsertBuilder.delete).toHaveBeenCalled();
  });

  it("rechaza con NX-SYS-006 si se envía email pero falta contraseña o nombre de dueño", async () => {
    const formData = crearFormData({
      ...DATOS_VALIDOS,
      email: "pedro@almacen.com",
    });

    const resultado = await crearCliente(ESTADO_CREAR_CLIENTE_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-006", exito: false });
  });

  it("retorna NX-ADM-001 ante un slug ya existente, sin registrar auditoría", async () => {
    const solicitanteBuilder = crearQueryBuilder({
      data: { usuario_id: USUARIO_ID_ADMIN, rol: "admin_nodexa" },
      error: null,
    });
    const insertBuilder = crearQueryBuilder({
      data: null,
      error: { code: "23505", message: "duplicate key value violates unique constraint" },
    });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn(() => solicitanteBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const adminMock = { from: vi.fn(() => insertBuilder) };
    vi.mocked(crearClienteSupabaseAdmin).mockReturnValue(adminMock as never);

    const resultado = await crearCliente(ESTADO_CREAR_CLIENTE_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-ADM-001", exito: false, clienteId: null });
    expect(registrarDiff).not.toHaveBeenCalled();
  });
});

