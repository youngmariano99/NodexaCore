import { beforeEach, describe, expect, it, vi } from "vitest";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

import { actualizarProducto } from "./actualizarProducto";
import { ESTADO_ACTUALIZAR_PRODUCTO_INICIAL } from "./tipos";

vi.mock("@/lib/supabase/server", () => ({
  crearClienteSupabaseServidor: vi.fn(),
}));

vi.mock("@/lib/auditoria/registrarDiff", () => ({
  registrarDiff: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
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
    update: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => resultado),
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
const PRODUCTO_ID = "p-1";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("actualizarProducto", () => {
  it("rechaza un payload sin ningún campo con NX-SYS-006 sin consultar Supabase", async () => {
    const resultado = await actualizarProducto(PRODUCTO_ID, ESTADO_ACTUALIZAR_PRODUCTO_INICIAL, crearFormData({}));

    expect(resultado).toEqual({ error: "NX-SYS-006", exito: false });
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("rechaza un precio negativo con NX-SYS-006", async () => {
    const formData = crearFormData({ precio: "-10" });

    const resultado = await actualizarProducto(PRODUCTO_ID, ESTADO_ACTUALIZAR_PRODUCTO_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-006", exito: false });
  });

  it("rechaza sin sesión activa con NX-SYS-002", async () => {
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(mockearSesion(null) as never);

    const resultado = await actualizarProducto(
      PRODUCTO_ID,
      ESTADO_ACTUALIZAR_PRODUCTO_INICIAL,
      crearFormData({ nombre: "Nuevo nombre" }),
    );

    expect(resultado).toEqual({ error: "NX-SYS-002", exito: false });
  });

  it("retorna NX-SYS-007 sin aplicar cambios cuando el producto pertenece a otro cliente_id", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID },
      error: null,
    });
    // El guard de pertenencia no encuentra fila: producto_id + cliente_id del solicitante no matchean.
    const guardBuilder = crearBuilderSingle({ data: null, error: null });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi.fn().mockReturnValueOnce(solicitanteBuilder).mockReturnValueOnce(guardBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await actualizarProducto(
      PRODUCTO_ID,
      ESTADO_ACTUALIZAR_PRODUCTO_INICIAL,
      crearFormData({ precio: "5000" }),
    );

    expect(resultado).toEqual({ error: "NX-SYS-007", exito: false });
    // Nunca se llegó a construir el UPDATE (from solo se llamó para solicitante + guard).
    expect(supabaseMock.from).toHaveBeenCalledTimes(2);
    // El único registrarDiff disparado es el intento de acceso cruzado del guard, no un diff de campo.
    expect(registrarDiff).toHaveBeenCalledTimes(1);
    expect(registrarDiff).toHaveBeenCalledWith(expect.objectContaining({ campoModificado: "intento_acceso_cruzado" }));
  });

  it("retorna NX-PRD-006 sin aplicar cambios cuando el producto ya fue dado de baja", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID },
      error: null,
    });
    const guardBuilder = crearBuilderSingle({ data: { producto_id: PRODUCTO_ID }, error: null });
    const valoresAnterioresBuilder = crearBuilderSingle({
      data: {
        nombre: "Yerba Mate 1kg",
        descripcion: "ej.",
        categoria: "Almacén",
        precio: 3500,
        eliminado_en: "2026-08-01T00:00:00.000Z",
      },
      error: null,
    });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi
        .fn()
        .mockReturnValueOnce(solicitanteBuilder)
        .mockReturnValueOnce(guardBuilder)
        .mockReturnValueOnce(valoresAnterioresBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await actualizarProducto(
      PRODUCTO_ID,
      ESTADO_ACTUALIZAR_PRODUCTO_INICIAL,
      crearFormData({ precio: "4200" }),
    );

    expect(resultado).toEqual({ error: "NX-PRD-006", exito: false });
    expect(registrarDiff).not.toHaveBeenCalled();
  });

  it("actualiza el precio, refresca actualizado_en y registra el diff campo por campo", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID },
      error: null,
    });
    const guardBuilder = crearBuilderSingle({ data: { producto_id: PRODUCTO_ID }, error: null });
    const valoresAnterioresBuilder = crearBuilderSingle({
      data: { nombre: "Yerba Mate 1kg", descripcion: "ej.", categoria: "Almacén", precio: 3500 },
      error: null,
    });
    const actualizacionBuilder = crearBuilderSingle({
      data: {
        producto_id: PRODUCTO_ID,
        nombre: "Yerba Mate 1kg",
        descripcion: "ej.",
        categoria: "Almacén",
        precio: 4200,
        actualizado_en: "2026-08-09T12:00:00.000Z",
      },
      error: null,
    });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi
        .fn()
        .mockReturnValueOnce(solicitanteBuilder)
        .mockReturnValueOnce(guardBuilder)
        .mockReturnValueOnce(valoresAnterioresBuilder)
        .mockReturnValueOnce(actualizacionBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await actualizarProducto(
      PRODUCTO_ID,
      ESTADO_ACTUALIZAR_PRODUCTO_INICIAL,
      crearFormData({ precio: "4200" }),
    );

    expect(resultado).toEqual({ error: null, exito: true });

    expect(actualizacionBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ precio: 4200, actualizado_en: expect.any(String) }),
    );

    expect(registrarDiff).toHaveBeenCalledTimes(1);
    expect(registrarDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: CLIENTE_ID,
        usuarioId: USUARIO_ID,
        tablaAfectada: "productos",
        registroId: PRODUCTO_ID,
        campoModificado: "precio",
        valorAnterior: "3500",
        valorNuevo: "4200",
      }),
    );
  });

  it("registra un diff por cada campo modificado cuando se editan varios a la vez", async () => {
    const solicitanteBuilder = crearBuilderSingle({
      data: { usuario_id: USUARIO_ID, rol: "empleado", cliente_id: CLIENTE_ID },
      error: null,
    });
    const guardBuilder = crearBuilderSingle({ data: { producto_id: PRODUCTO_ID }, error: null });
    const valoresAnterioresBuilder = crearBuilderSingle({
      data: { nombre: "Viejo", descripcion: "ej.", categoria: "Almacén", precio: 1000 },
      error: null,
    });
    const actualizacionBuilder = crearBuilderSingle({
      data: {
        producto_id: PRODUCTO_ID,
        nombre: "Nuevo",
        descripcion: "ej.",
        categoria: "Bebidas",
        precio: 1000,
        actualizado_en: "2026-08-09T12:00:00.000Z",
      },
      error: null,
    });

    const supabaseMock = {
      ...mockearSesion({ id: AUTH_USER_ID }),
      from: vi
        .fn()
        .mockReturnValueOnce(solicitanteBuilder)
        .mockReturnValueOnce(guardBuilder)
        .mockReturnValueOnce(valoresAnterioresBuilder)
        .mockReturnValueOnce(actualizacionBuilder),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await actualizarProducto(
      PRODUCTO_ID,
      ESTADO_ACTUALIZAR_PRODUCTO_INICIAL,
      crearFormData({ nombre: "Nuevo", categoria: "Bebidas" }),
    );

    expect(resultado).toEqual({ error: null, exito: true });
    expect(registrarDiff).toHaveBeenCalledTimes(2);
    expect(registrarDiff).toHaveBeenCalledWith(
      expect.objectContaining({ campoModificado: "nombre", valorAnterior: "Viejo", valorNuevo: "Nuevo" }),
    );
    expect(registrarDiff).toHaveBeenCalledWith(
      expect.objectContaining({ campoModificado: "categoria", valorAnterior: "Almacén", valorNuevo: "Bebidas" }),
    );
  });
});
