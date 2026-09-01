import ExcelJS from "exceljs";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseAdmin, crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { contarProductosActivos, insertarProductosEnLote } from "@/repositories/productosRepository";

import { POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  crearClienteSupabaseServidor: vi.fn(),
  crearClienteSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/auditoria/registrarDiff", () => ({
  registrarDiff: vi.fn(),
}));

vi.mock("@/repositories/productosRepository", async () => {
  const actual = await vi.importActual<typeof import("@/repositories/productosRepository")>(
    "@/repositories/productosRepository",
  );
  return { ...actual, contarProductosActivos: vi.fn(), insertarProductosEnLote: vi.fn() };
});

interface ResultadoSupabase {
  data: unknown;
  error: unknown;
}

interface FilaExcelPrueba {
  sku?: string | number;
  nombre?: string;
  precio?: string | number;
  categoria?: string;
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

function mockearSesion(usuario: { id: string } | null) {
  return { auth: { getUser: vi.fn(async () => ({ data: { user: usuario } })) } };
}

function mockearSupabaseCompleto(opciones: { solicitante: ResultadoSupabase; cliente?: ResultadoSupabase }) {
  const solicitanteBuilder = crearBuilderSingle(opciones.solicitante);
  const clienteBuilder = crearBuilderSingle(opciones.cliente ?? { data: { limite_sku: 1000 }, error: null });

  const from = vi.fn((tabla: string) => {
    if (tabla === "usuarios") return solicitanteBuilder;
    if (tabla === "clientes") return clienteBuilder;
    throw new Error(`tabla no mockeada en el test: ${tabla}`);
  });

  return { ...mockearSesion({ id: AUTH_USER_ID }), from };
}

async function crearArchivoExcel(
  filas: FilaExcelPrueba[],
  encabezados: string[] = ["sku", "nombre", "precio", "categoria"],
): Promise<File> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("productos");
  hoja.addRow(encabezados);
  filas.forEach((fila) => {
    hoja.addRow([fila.sku, fila.nombre, fila.precio, fila.categoria]);
  });
  const buffer = await libro.xlsx.writeBuffer();
  return new File([buffer], "catalogo.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function crearRequestConArchivo(archivo: File | null, clienteIdOverride?: string): NextRequest {
  const formData = new FormData();
  if (archivo) {
    formData.set("archivo", archivo);
  }
  if (clienteIdOverride) {
    formData.set("cliente_id_override", clienteIdOverride);
  }
  return new NextRequest("http://localhost:3000/api/productos/importar", { method: "POST", body: formData });
}

const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
const CLIENTE_ID = "a1111111-1111-4111-8111-111111111111";
const CLIENTE_ID_OVERRIDE = "b2222222-2222-4222-8222-222222222222";
const USUARIO_ID = "u-comerciante";
const USUARIO_ID_ADMIN = "u-admin";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/productos/importar", () => {
  it("retorna 401 con NX-SYS-002 sin sesión activa", async () => {
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(mockearSesion(null) as never);

    const respuesta = await POST(crearRequestConArchivo(await crearArchivoExcel([])));

    expect(respuesta.status).toBe(401);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-SYS-002" }));
  });

  it("retorna 403 con NX-SYS-003 si el solicitante es admin_nodexa y no envía cliente_id_override", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID_ADMIN, rol: "admin_nodexa", cliente_id: null }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const respuesta = await POST(crearRequestConArchivo(await crearArchivoExcel([])));

    expect(respuesta.status).toBe(403);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-SYS-003" }));
    expect(contarProductosActivos).not.toHaveBeenCalled();
  });

  it("permite a admin_nodexa importar en otro tenant usando cliente_id_override", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID_ADMIN, rol: "admin_nodexa", cliente_id: null }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const clienteOverrideBuilder = crearBuilderSingle({ data: { limite_sku: 500 }, error: null });
    const adminMock = {
      from: vi.fn((tabla: string) => {
        if (tabla === "clientes") return clienteOverrideBuilder;
        throw new Error(`tabla admin no mockeada: ${tabla}`);
      }),
    };
    vi.mocked(crearClienteSupabaseAdmin).mockReturnValue(adminMock as never);
    vi.mocked(contarProductosActivos).mockResolvedValue({ ok: true, data: 10 });
    vi.mocked(insertarProductosEnLote).mockResolvedValue({
      ok: true,
      data: [{ producto_id: "p-admin-1", sku: "ADM-001" }],
    });

    const archivo = await crearArchivoExcel([
      { sku: "ADM-001", nombre: "Producto Admin", precio: 500, categoria: "Electrónica" },
    ]);

    const respuesta = await POST(crearRequestConArchivo(archivo, CLIENTE_ID_OVERRIDE));

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.insertados).toBe(1);
    expect(insertarProductosEnLote).toHaveBeenCalledWith(adminMock, CLIENTE_ID_OVERRIDE, [
      { sku: "ADM-001", nombre: "Producto Admin", precio: 500, categoria: "Electrónica" },
    ]);
    expect(registrarDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: CLIENTE_ID_OVERRIDE,
        usuarioId: USUARIO_ID_ADMIN,
        registroId: "p-admin-1",
        tablaAfectada: "productos",
      }),
    );
  });

  it("retorna 403 con NX-SYS-003 si un comerciante intenta usar cliente_id_override", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const archivo = await crearArchivoExcel([
      { sku: "HACK-001", nombre: "Intento Override", precio: 100, categoria: "Test" },
    ]);

    const respuesta = await POST(crearRequestConArchivo(archivo, CLIENTE_ID_OVERRIDE));

    expect(respuesta.status).toBe(403);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-SYS-003" }));
    expect(insertarProductosEnLote).not.toHaveBeenCalled();
  });


  it("retorna 422 con NX-PRD-007 si no se envía archivo", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const respuesta = await POST(crearRequestConArchivo(null));

    expect(respuesta.status).toBe(422);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-PRD-007" }));
  });

  it("retorna 422 con NX-PRD-007 y la plantilla esperada si al archivo le faltan columnas", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const archivo = await crearArchivoExcel([{ sku: "A", nombre: "Prod", precio: 10 }], ["sku", "nombre", "precio"]);

    const respuesta = await POST(crearRequestConArchivo(archivo));

    expect(respuesta.status).toBe(422);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe("NX-PRD-007");
    expect(cuerpo.columnasEsperadas).toEqual(["sku", "nombre", "precio", "categoria"]);
    expect(contarProductosActivos).not.toHaveBeenCalled();
  });

  it("inserta las filas válidas y reporta un archivo con filas mixtas (válidas e inválidas)", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      cliente: { data: { limite_sku: 1000 }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    vi.mocked(contarProductosActivos).mockResolvedValue({ ok: true, data: 0 });
    vi.mocked(insertarProductosEnLote).mockResolvedValue({
      ok: true,
      data: [{ producto_id: "p-1", sku: "OK-001" }],
    });

    const archivo = await crearArchivoExcel([
      { sku: "OK-001", nombre: "Producto válido", precio: 100, categoria: "Almacén" },
      { nombre: "Sin sku", precio: 100, categoria: "Almacén" },
      { sku: "NEG-001", nombre: "Precio negativo", precio: -5, categoria: "Almacén" },
    ]);

    const respuesta = await POST(crearRequestConArchivo(archivo));

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.total).toBe(3);
    expect(cuerpo.insertados).toBe(1);
    expect(cuerpo.rechazados).toBe(2);
    expect(cuerpo.filas).toEqual([
      expect.objectContaining({ fila: 2, sku: "OK-001", insertado: true, error: null }),
      expect.objectContaining({ fila: 3, sku: null, insertado: false, error: "NX-PRD-007" }),
      expect.objectContaining({ fila: 4, sku: "NEG-001", insertado: false, error: "NX-PRD-007" }),
    ]);
    expect(insertarProductosEnLote).toHaveBeenCalledWith(expect.anything(), CLIENTE_ID, [
      { sku: "OK-001", nombre: "Producto válido", precio: 100, categoria: "Almacén" },
    ]);
    expect(registrarDiff).toHaveBeenCalledWith(
      expect.objectContaining({ clienteId: CLIENTE_ID, usuarioId: USUARIO_ID, registroId: "p-1", tablaAfectada: "productos" }),
    );
  });

  it("rechaza las filas excedentes con NX-PRD-001 sin bloquear las que sí entran en el límite", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      cliente: { data: { limite_sku: 1000 }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    vi.mocked(contarProductosActivos).mockResolvedValue({ ok: true, data: 999 });
    vi.mocked(insertarProductosEnLote).mockResolvedValue({
      ok: true,
      data: [{ producto_id: "p-1", sku: "OK-001" }],
    });

    const archivo = await crearArchivoExcel([
      { sku: "OK-001", nombre: "Entra", precio: 100, categoria: "Almacén" },
      { sku: "EXTRA-001", nombre: "No entra", precio: 100, categoria: "Almacén" },
    ]);

    const respuesta = await POST(crearRequestConArchivo(archivo));

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.filas).toEqual([
      expect.objectContaining({ sku: "OK-001", insertado: true, error: null }),
      expect.objectContaining({ sku: "EXTRA-001", insertado: false, error: "NX-PRD-001" }),
    ]);
    expect(insertarProductosEnLote).toHaveBeenCalledWith(expect.anything(), CLIENTE_ID, [
      { sku: "OK-001", nombre: "Entra", precio: 100, categoria: "Almacén" },
    ]);
  });

  it("rechaza un SKU repetido dentro del mismo archivo con NX-PRD-002 sin bloquear la primera aparición", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    vi.mocked(contarProductosActivos).mockResolvedValue({ ok: true, data: 0 });
    vi.mocked(insertarProductosEnLote).mockResolvedValue({
      ok: true,
      data: [{ producto_id: "p-1", sku: "DUP-001" }],
    });

    const archivo = await crearArchivoExcel([
      { sku: "DUP-001", nombre: "Primero", precio: 100, categoria: "Almacén" },
      { sku: "DUP-001", nombre: "Repetido", precio: 100, categoria: "Almacén" },
    ]);

    const respuesta = await POST(crearRequestConArchivo(archivo));

    const cuerpo = await respuesta.json();
    expect(cuerpo.filas).toEqual([
      expect.objectContaining({ fila: 2, sku: "DUP-001", insertado: true }),
      expect.objectContaining({ fila: 3, sku: "DUP-001", insertado: false, error: "NX-PRD-002" }),
    ]);
    expect(insertarProductosEnLote).toHaveBeenCalledWith(expect.anything(), CLIENTE_ID, [
      { sku: "DUP-001", nombre: "Primero", precio: 100, categoria: "Almacén" },
    ]);
  });

  it("rechaza un SKU ya existente en el tenant (fuera del lote) con NX-PRD-002 según lo que devuelve el upsert", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    vi.mocked(contarProductosActivos).mockResolvedValue({ ok: true, data: 0 });
    vi.mocked(insertarProductosEnLote).mockResolvedValue({ ok: true, data: [] });

    const archivo = await crearArchivoExcel([{ sku: "YA-EXISTE", nombre: "Repetido en DB", precio: 100, categoria: "Almacén" }]);

    const respuesta = await POST(crearRequestConArchivo(archivo));

    const cuerpo = await respuesta.json();
    expect(cuerpo.filas).toEqual([expect.objectContaining({ sku: "YA-EXISTE", insertado: false, error: "NX-PRD-002" })]);
  });
});
