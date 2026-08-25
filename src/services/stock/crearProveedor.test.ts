import { beforeEach, describe, expect, it, vi } from "vitest";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { contarProveedoresActivos, insertarProveedor } from "@/repositories/proveedoresRepository";

import { crearProveedor } from "./crearProveedor";
import { ESTADO_CREAR_PROVEEDOR_INICIAL } from "./tipos";

vi.mock("@/lib/supabase/server", () => ({
  crearClienteSupabaseServidor: vi.fn(),
}));

vi.mock("@/lib/auditoria/registrarDiff", () => ({
  registrarDiff: vi.fn(async () => {}),
}));

vi.mock("@/repositories/proveedoresRepository", () => ({
  contarProveedoresActivos: vi.fn(),
  insertarProveedor: vi.fn(),
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

const DATOS_VALIDOS = {
  nombre: "Distribuidora Sur",
  contacto: "sur@correo.com",
  diasDemora: "3",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("crearProveedor", () => {
  it("rechaza entradas inválidas con NX-SYS-006", async () => {
    const formData = crearFormData({
      nombre: "",
      contacto: "test",
      diasDemora: "-5",
    });

    const resultado = await crearProveedor(ESTADO_CREAR_PROVEEDOR_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-006", exito: false });
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("rechaza sin sesión activa con NX-SYS-002", async () => {
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(mockearSesion(null) as never);

    const resultado = await crearProveedor(ESTADO_CREAR_PROVEEDOR_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-SYS-002", exito: false });
  });

  it("rechaza por falta de permisos (NX-SYS-003) cuando el solicitante es admin_nodexa", async () => {
    const solicitanteBuilder = crearBuilder({
      data: { usuario_id: "u-admin", rol: "admin_nodexa", cliente_id: null },
      error: null,
    });
    const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: vi.fn(() => solicitanteBuilder) };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await crearProveedor(ESTADO_CREAR_PROVEEDOR_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-SYS-003", exito: false });
    expect(contarProveedoresActivos).not.toHaveBeenCalled();
  });

  it("retorna NX-PROV-001 sin insertar cuando el conteo de proveedores activos ya es 20 (límite alcanzado)", async () => {
    const solicitanteBuilder = crearBuilder({
      data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID },
      error: null,
    });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn().mockReturnValueOnce(solicitanteBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    vi.mocked(contarProveedoresActivos).mockResolvedValue({ ok: true, data: 20 });

    const resultado = await crearProveedor(ESTADO_CREAR_PROVEEDOR_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-PROV-001", exito: false });
    expect(insertarProveedor).not.toHaveBeenCalled();
  });

  it("da de alta el proveedor y registra la auditoría asíncronamente cuando el comercio tiene 19 proveedores", async () => {
    const solicitanteBuilder = crearBuilder({
      data: { usuario_id: USUARIO_ID, rol: "empleado", cliente_id: CLIENTE_ID },
      error: null,
    });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn().mockReturnValueOnce(solicitanteBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    vi.mocked(contarProveedoresActivos).mockResolvedValue({ ok: true, data: 19 });
    vi.mocked(insertarProveedor).mockResolvedValue({
      ok: true,
      data: {
        proveedor_id: "prov-nuevo",
        cliente_id: CLIENTE_ID,
        nombre: "Distribuidora Sur",
        contacto: "sur@correo.com",
        dias_demora: 3,
        creado_en: "now",
        eliminado_en: null,
      },
    });

    const resultado = await crearProveedor(ESTADO_CREAR_PROVEEDOR_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: null, exito: true });
    expect(insertarProveedor).toHaveBeenCalledWith(expect.anything(), {
      clienteId: CLIENTE_ID,
      nombre: "Distribuidora Sur",
      contacto: "sur@correo.com",
      diasDemora: 3,
    });
    expect(registrarDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: CLIENTE_ID,
        usuarioId: USUARIO_ID,
        tablaAfectada: "proveedores",
        registroId: "prov-nuevo",
        campoModificado: "alta",
      }),
    );
  });
});
