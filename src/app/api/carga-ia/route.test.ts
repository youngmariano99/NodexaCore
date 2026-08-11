import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { extraerDatosEtiqueta } from "@/lib/openai/extraerDatosEtiqueta";
import { verificarCargaIaLimiter } from "@/lib/rate-limit/cargaIaLimiter";
import { subirImagenComoWebp } from "@/repositories/imagenesRepository";
import { registrarCargaIa, registrarConsumoIa } from "@/repositories/cargasIaRepository";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

import { POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  crearClienteSupabaseServidor: vi.fn(),
}));

vi.mock("@/lib/rate-limit/cargaIaLimiter", () => ({
  verificarCargaIaLimiter: vi.fn(),
}));

vi.mock("@/lib/openai/extraerDatosEtiqueta", () => ({
  extraerDatosEtiqueta: vi.fn(),
}));

vi.mock("@/repositories/imagenesRepository", () => ({
  subirImagenComoWebp: vi.fn(),
}));

vi.mock("@/repositories/cargasIaRepository", () => ({
  registrarConsumoIa: vi.fn(),
  registrarCargaIa: vi.fn(),
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

function mockearSupabaseCompleto(opciones: {
  solicitante: ResultadoSupabase;
  modulo?: ResultadoSupabase;
  clienteCuota?: ResultadoSupabase;
}) {
  const solicitanteBuilder = crearBuilderSingle(opciones.solicitante);
  const moduloBuilder = crearBuilderMaybeSingle(opciones.modulo ?? { data: { activo: true }, error: null });
  const clienteCuotaBuilder = crearBuilderSingle(
    opciones.clienteCuota ?? { data: { ia_consultas_usadas: 34, cuota_mensual_ia: 40 }, error: null },
  );

  const from = vi.fn((tabla: string) => {
    if (tabla === "usuarios") return solicitanteBuilder;
    if (tabla === "tenant_modules") return moduloBuilder;
    if (tabla === "clientes") return clienteCuotaBuilder;
    throw new Error(`tabla no mockeada en el test: ${tabla}`);
  });

  return { ...mockearSesion({ id: AUTH_USER_ID }), from };
}

function crearImagenValida(): File {
  return new File([new Uint8Array([1, 2, 3])], "etiqueta.jpg", { type: "image/jpeg" });
}

function crearRequestConImagen(imagen: File | null): NextRequest {
  const formData = new FormData();
  if (imagen) {
    formData.set("imagen", imagen);
  }
  return new NextRequest("http://localhost:3000/api/carga-ia", { method: "POST", body: formData });
}

const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
const CLIENTE_ID = "b2222222-2222-4222-8222-222222222222";
const USUARIO_ID = "u-comerciante";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verificarCargaIaLimiter).mockResolvedValue({ permitido: true, reintentarEnSegundos: 0 });
  vi.mocked(registrarConsumoIa).mockResolvedValue({ ok: true, data: null });
  vi.mocked(subirImagenComoWebp).mockResolvedValue({
    ok: true,
    data: { url: "https://res.cloudinary.com/nodexa/cargas-ia/etiqueta.webp", bytes: 1000, ancho: 800, alto: 600, formato: "webp" },
  });
  vi.mocked(extraerDatosEtiqueta).mockResolvedValue({
    ok: true,
    data: { nombre: "Tornillo 3/4", precio: 120, categoria: "Tornillería" },
  });
  vi.mocked(registrarCargaIa).mockResolvedValue({
    ok: true,
    data: {
      carga_ia_id: "c-1",
      cliente_id: CLIENTE_ID,
      usuario_id: USUARIO_ID,
      producto_id: null,
      imagen_url: "https://res.cloudinary.com/nodexa/cargas-ia/etiqueta.webp",
      resultado_extraido: { nombre: "Tornillo 3/4", precio: 120, categoria: "Tornillería" },
      creado_en: "2026-08-11T10:00:00.000Z",
    },
  });
});

describe("POST /api/carga-ia", () => {
  it("retorna 401 con NX-SYS-002 sin sesión activa", async () => {
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(mockearSesion(null) as never);

    const respuesta = await POST(crearRequestConImagen(crearImagenValida()));

    expect(respuesta.status).toBe(401);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-SYS-002" }));
  });

  it("retorna 403 con NX-SYS-003 si el solicitante es admin_nodexa", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "admin_nodexa", cliente_id: null }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const respuesta = await POST(crearRequestConImagen(crearImagenValida()));

    expect(respuesta.status).toBe(403);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-SYS-003" }));
  });

  it("retorna 429 con NX-SYS-005 si el rate limiter bloquea la solicitud", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    vi.mocked(verificarCargaIaLimiter).mockResolvedValue({ permitido: false, reintentarEnSegundos: 42 });

    const respuesta = await POST(crearRequestConImagen(crearImagenValida()));

    expect(respuesta.status).toBe(429);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-SYS-005", reintentarEnSegundos: 42 }));
    expect(registrarConsumoIa).not.toHaveBeenCalled();
  });

  it("retorna 400 con NX-IA-004 si no se envía imagen", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const respuesta = await POST(crearRequestConImagen(null));

    expect(respuesta.status).toBe(400);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-IA-004" }));
  });

  it("retorna 400 con NX-IA-004 si el archivo no es un formato de imagen permitido", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const archivoPdf = new File([new Uint8Array([1])], "etiqueta.pdf", { type: "application/pdf" });

    const respuesta = await POST(crearRequestConImagen(archivoPdf));

    expect(respuesta.status).toBe(400);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-IA-004" }));
  });

  it("retorna 403 con NX-IA-001 si el módulo carga_ia no está activo en el tenant", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      modulo: { data: { activo: false }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const respuesta = await POST(crearRequestConImagen(crearImagenValida()));

    expect(respuesta.status).toBe(403);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-IA-001" }));
    expect(registrarConsumoIa).not.toHaveBeenCalled();
  });

  it("retorna 403 con NX-IA-001 si el tenant no tiene fila en tenant_modules para carga_ia", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      modulo: { data: null, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const respuesta = await POST(crearRequestConImagen(crearImagenValida()));

    expect(respuesta.status).toBe(403);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-IA-001" }));
  });

  it("retorna 429 con NX-IA-002 si ia_consultas_usadas ya iguala cuota_mensual_ia (Fail-Fast, Paso 1-2), sin invocar el RPC ni subir la imagen", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      clienteCuota: { data: { ia_consultas_usadas: 40, cuota_mensual_ia: 40 }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const respuesta = await POST(crearRequestConImagen(crearImagenValida()));

    expect(respuesta.status).toBe(429);
    expect(await respuesta.json()).toEqual(
      expect.objectContaining({ codigo: "NX-IA-002", iaConsultasUsadas: 40, cuotaMensualIa: 40 }),
    );
    expect(registrarConsumoIa).not.toHaveBeenCalled();
    expect(subirImagenComoWebp).not.toHaveBeenCalled();
    expect(extraerDatosEtiqueta).not.toHaveBeenCalled();
  });

  it("retorna 429 con NX-IA-002 si el RPC rechaza por concurrencia aunque la lectura previa mostraba cupo disponible", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      clienteCuota: { data: { ia_consultas_usadas: 39, cuota_mensual_ia: 40 }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    vi.mocked(registrarConsumoIa).mockResolvedValue({ ok: false, error: "NX-IA-002" });

    const respuesta = await POST(crearRequestConImagen(crearImagenValida()));

    expect(respuesta.status).toBe(429);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-IA-002" }));
    expect(subirImagenComoWebp).not.toHaveBeenCalled();
    expect(extraerDatosEtiqueta).not.toHaveBeenCalled();
  });

  it("retorna 500 con NX-SYS-001 si la lectura previa de cuota falla", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
      clienteCuota: { data: null, error: { message: "fallo" } },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const respuesta = await POST(crearRequestConImagen(crearImagenValida()));

    expect(respuesta.status).toBe(500);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-SYS-001" }));
  });

  it("retorna 502 con NX-PRD-005 si falla la subida a Cloudinary", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    vi.mocked(subirImagenComoWebp).mockResolvedValue({ ok: false, error: "NX-PRD-005" });

    const respuesta = await POST(crearRequestConImagen(crearImagenValida()));

    expect(respuesta.status).toBe(502);
    expect(await respuesta.json()).toEqual(expect.objectContaining({ codigo: "NX-PRD-005" }));
    expect(extraerDatosEtiqueta).not.toHaveBeenCalled();
  });

  it("retorna 502 con NX-IA-003 y registra la carga con resultado_extraido NULL si la imagen es ilegible", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);
    vi.mocked(extraerDatosEtiqueta).mockResolvedValue({ ok: false, error: "NX-IA-003" });

    const respuesta = await POST(crearRequestConImagen(crearImagenValida()));

    expect(respuesta.status).toBe(502);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe("NX-IA-003");
    expect(cuerpo.alternarAltaManual).toBe(true);
    expect(registrarCargaIa).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ clienteId: CLIENTE_ID, usuarioId: USUARIO_ID, resultadoExtraido: null }),
    );
  });

  it("retorna 200 con nombre, precio y categoría sugeridos y registra la carga en cargas_ia", async () => {
    const supabaseMock = mockearSupabaseCompleto({
      solicitante: { data: { usuario_id: USUARIO_ID, rol: "comerciante", cliente_id: CLIENTE_ID }, error: null },
    });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const respuesta = await POST(crearRequestConImagen(crearImagenValida()));

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toEqual(
      expect.objectContaining({
        cargaIaId: "c-1",
        nombre: "Tornillo 3/4",
        precio: 120,
        categoria: "Tornillería",
      }),
    );
    expect(registrarConsumoIa).toHaveBeenCalledTimes(1);
    expect(registrarCargaIa).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        clienteId: CLIENTE_ID,
        usuarioId: USUARIO_ID,
        resultadoExtraido: { nombre: "Tornillo 3/4", precio: 120, categoria: "Tornillería" },
      }),
    );
  });
});
