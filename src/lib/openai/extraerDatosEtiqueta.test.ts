import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// El paquete "server-only" lanza al importarse fuera de un bundle de Next.js
// server-side; se stubea para poder importar el módulo real bajo test en Node.
vi.mock("server-only", () => ({}));

vi.mock("@/lib/env", () => ({
  obtenerEntornoServidor: vi.fn(() => ({ OPENAI_API_KEY: "sk-test-fake" })),
}));

function respuestaOpenAi(contenido: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => ({ choices: [{ message: { content: JSON.stringify(contenido) } }] }),
  } as Response;
}

const IMAGEN_URL = "https://res.cloudinary.com/nodexa/cargas-ia/etiqueta.webp";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("extraerDatosEtiqueta", () => {
  it("llama a la API de OpenAI con el modelo gpt-4o-mini y la imagen como image_url", async () => {
    vi.mocked(fetch).mockResolvedValue(
      respuestaOpenAi({ legible: true, nombre: "Yerba Mate 1kg", precio: 3500, categoria: "Almacén" }),
    );

    const { extraerDatosEtiqueta } = await import("./extraerDatosEtiqueta");
    await extraerDatosEtiqueta(IMAGEN_URL);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({ method: "POST" }),
    );
    const cuerpoEnviado = JSON.parse(vi.mocked(fetch).mock.calls[0]![1]!.body as string);
    expect(cuerpoEnviado.model).toBe("gpt-4o-mini");
    expect(cuerpoEnviado.messages[1].content[1]).toEqual({ type: "image_url", image_url: { url: IMAGEN_URL } });
  });

  it("retorna nombre, precio y categoría cuando la extracción es legible", async () => {
    vi.mocked(fetch).mockResolvedValue(
      respuestaOpenAi({ legible: true, nombre: "Yerba Mate 1kg", precio: 3500, categoria: "Almacén" }),
    );

    const { extraerDatosEtiqueta } = await import("./extraerDatosEtiqueta");
    const resultado = await extraerDatosEtiqueta(IMAGEN_URL);

    expect(resultado).toEqual({ ok: true, data: { nombre: "Yerba Mate 1kg", precio: 3500, categoria: "Almacén" } });
  });

  it("retorna NX-IA-003 cuando el modelo marca la imagen como no legible", async () => {
    vi.mocked(fetch).mockResolvedValue(respuestaOpenAi({ legible: false, nombre: null, precio: null, categoria: null }));

    const { extraerDatosEtiqueta } = await import("./extraerDatosEtiqueta");
    const resultado = await extraerDatosEtiqueta(IMAGEN_URL);

    expect(resultado).toEqual({ ok: false, error: "NX-IA-003" });
  });

  it("retorna NX-IA-003 si algún campo obligatorio viene null pese a legible=true", async () => {
    vi.mocked(fetch).mockResolvedValue(respuestaOpenAi({ legible: true, nombre: "Producto", precio: null, categoria: "Almacén" }));

    const { extraerDatosEtiqueta } = await import("./extraerDatosEtiqueta");
    const resultado = await extraerDatosEtiqueta(IMAGEN_URL);

    expect(resultado).toEqual({ ok: false, error: "NX-IA-003" });
  });

  it("retorna NX-IA-003 ante una respuesta HTTP no exitosa de OpenAI", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as Response);

    const { extraerDatosEtiqueta } = await import("./extraerDatosEtiqueta");
    const resultado = await extraerDatosEtiqueta(IMAGEN_URL);

    expect(resultado).toEqual({ ok: false, error: "NX-IA-003" });
  });

  it("retorna NX-IA-003 ante un fallo de red", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network error"));

    const { extraerDatosEtiqueta } = await import("./extraerDatosEtiqueta");
    const resultado = await extraerDatosEtiqueta(IMAGEN_URL);

    expect(resultado).toEqual({ ok: false, error: "NX-IA-003" });
  });

  it("retorna NX-IA-003 si el contenido del modelo no es JSON válido", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: "no-es-json" } }] }),
    } as Response);

    const { extraerDatosEtiqueta } = await import("./extraerDatosEtiqueta");
    const resultado = await extraerDatosEtiqueta(IMAGEN_URL);

    expect(resultado).toEqual({ ok: false, error: "NX-IA-003" });
  });

  it("retorna NX-IA-003 si el JSON no cumple el esquema esperado (Zod)", async () => {
    vi.mocked(fetch).mockResolvedValue(respuestaOpenAi({ legible: "si", nombre: 123 }));

    const { extraerDatosEtiqueta } = await import("./extraerDatosEtiqueta");
    const resultado = await extraerDatosEtiqueta(IMAGEN_URL);

    expect(resultado).toEqual({ ok: false, error: "NX-IA-003" });
  });

  it("retorna NX-IA-003 si la respuesta no trae contenido en el mensaje", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [] }),
    } as Response);

    const { extraerDatosEtiqueta } = await import("./extraerDatosEtiqueta");
    const resultado = await extraerDatosEtiqueta(IMAGEN_URL);

    expect(resultado).toEqual({ ok: false, error: "NX-IA-003" });
  });
});
