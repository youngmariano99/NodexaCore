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

    expect(resultado).toEqual({ error: null, exito: true });

    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre_comercio: "Almacén Don Pedro",
        slug: "almacen-don-pedro",
        telefono_whatsapp: "+5492920000001",
        estado_pago: true,
        limite_sku: 1000,
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

    expect(resultado).toEqual({ error: "NX-ADM-001", exito: false });
    expect(registrarDiff).not.toHaveBeenCalled();
  });
});
