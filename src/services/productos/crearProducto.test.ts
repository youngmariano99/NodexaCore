import { beforeEach, describe, expect, it, vi } from "vitest";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { contarProductosActivos, insertarProducto } from "@/repositories/productosRepository";

import { crearProducto } from "./crearProducto";
import { ESTADO_CREAR_PRODUCTO_INICIAL } from "./tipos";

vi.mock("@/lib/supabase/server", () => ({
  crearClienteSupabaseServidor: vi.fn(),
}));

vi.mock("@/lib/auditoria/registrarDiff", () => ({
  registrarDiff: vi.fn(),
}));

vi.mock("@/repositories/productosRepository", () => ({
  contarProductosActivos: vi.fn(),
  insertarProducto: vi.fn(),
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

const DATOS_VALIDOS = { sku: "ABC-001", nombre: "Yerba Mate 1kg", precio: "3500", categoria: "Almacén" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("crearProducto", () => {
  it("rechaza un precio negativo con NX-PRD-003 sin consultar Supabase", async () => {
    const formData = crearFormData({ ...DATOS_VALIDOS, precio: "-100" });

    const resultado = await crearProducto(ESTADO_CREAR_PRODUCTO_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-PRD-003", exito: false });
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("rechaza un nombre faltante con el fallback genérico NX-SYS-006", async () => {
    const formData = crearFormData({ ...DATOS_VALIDOS, nombre: "" });

    const resultado = await crearProducto(ESTADO_CREAR_PRODUCTO_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-006", exito: false });
  });

  it("rechaza sin sesión activa con NX-SYS-002", async () => {
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(mockearSesion(null) as never);

    const resultado = await crearProducto(ESTADO_CREAR_PRODUCTO_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-SYS-002", exito: false });
  });

  it("rechaza por falta de permisos (NX-SYS-003) cuando el solicitante es admin_nodexa", async () => {
    const solicitanteBuilder = crearBuilder({
      data: { usuario_id: "u-admin", rol: "admin_nodexa", cliente_id: null },
      error: null,
    });
    const supabaseMock = { ...mockearSesion({ id: AUTH_USER_ID }), from: vi.fn(() => solicitanteBuilder) };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await crearProducto(ESTADO_CREAR_PRODUCTO_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-SYS-003", exito: false });
    expect(contarProductosActivos).not.toHaveBeenCalled();
  });

  it("retorna NX-PRD-001 sin insertar cuando el conteo de SKU activos ya alcanzó el límite", async () => {
    const solicitanteBuilder = crearBuilder({
      data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID },
      error: null,
    });
    const clienteBuilder = crearBuilder({ data: { limite_sku: 1000 }, error: null });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn().mockReturnValueOnce(solicitanteBuilder).mockReturnValueOnce(clienteBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    vi.mocked(contarProductosActivos).mockResolvedValue({ ok: true, data: 1000 });

    const resultado = await crearProducto(ESTADO_CREAR_PRODUCTO_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-PRD-001", exito: false });
    expect(insertarProducto).not.toHaveBeenCalled();
  });

  it("da de alta el producto y registra la auditoría de forma asíncrona sin bloquear la respuesta", async () => {
    const solicitanteBuilder = crearBuilder({
      data: { usuario_id: USUARIO_ID, rol: "empleado", cliente_id: CLIENTE_ID },
      error: null,
    });
    const clienteBuilder = crearBuilder({ data: { limite_sku: 1000 }, error: null });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn().mockReturnValueOnce(solicitanteBuilder).mockReturnValueOnce(clienteBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    vi.mocked(contarProductosActivos).mockResolvedValue({ ok: true, data: 50 });
    vi.mocked(insertarProducto).mockResolvedValue({
      ok: true,
      data: { producto_id: "p-nuevo", cliente_id: CLIENTE_ID, sku: "ABC-001", nombre: "Yerba Mate 1kg", precio: 3500, categoria: "Almacén" },
    });

    const resultado = await crearProducto(ESTADO_CREAR_PRODUCTO_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: null, exito: true });
    expect(insertarProducto).toHaveBeenCalledWith(expect.anything(), {
      clienteId: CLIENTE_ID,
      sku: "ABC-001",
      nombre: "Yerba Mate 1kg",
      precio: 3500,
      categoria: "Almacén",
    });
    expect(registrarDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: CLIENTE_ID,
        usuarioId: USUARIO_ID,
        tablaAfectada: "productos",
        registroId: "p-nuevo",
        campoModificado: "alta",
      }),
    );
  });

  it("propaga NX-PRD-002 cuando el repositorio detecta un SKU duplicado", async () => {
    const solicitanteBuilder = crearBuilder({
      data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID },
      error: null,
    });
    const clienteBuilder = crearBuilder({ data: { limite_sku: 1000 }, error: null });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn().mockReturnValueOnce(solicitanteBuilder).mockReturnValueOnce(clienteBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    vi.mocked(contarProductosActivos).mockResolvedValue({ ok: true, data: 5 });
    vi.mocked(insertarProducto).mockResolvedValue({ ok: false, error: "NX-PRD-002" });

    const resultado = await crearProducto(ESTADO_CREAR_PRODUCTO_INICIAL, crearFormData(DATOS_VALIDOS));

    expect(resultado).toEqual({ error: "NX-PRD-002", exito: false });
    expect(registrarDiff).not.toHaveBeenCalled();
  });
});
