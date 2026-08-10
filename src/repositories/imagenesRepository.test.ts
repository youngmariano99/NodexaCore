import { v2 as cloudinary } from "cloudinary";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { obtenerEntornoServidor } from "@/lib/env";

import { subirImagenComoWebp } from "./imagenesRepository";

vi.mock("cloudinary", () => ({
  v2: {
    config: vi.fn(),
    uploader: {
      upload: vi.fn(),
      upload_stream: vi.fn(),
    },
  },
}));

vi.mock("@/lib/env", () => ({
  obtenerEntornoServidor: vi.fn(),
}));

const OPCIONES = { carpeta: "nodexa/productos", anchoMaximo: 1080 };

const ENTORNO_FAKE = {
  CLOUDINARY_CLOUD_NAME: "demo",
  CLOUDINARY_API_KEY: "clave-api",
  CLOUDINARY_API_SECRET: "secreto-api",
};

const RESPUESTA_CLOUDINARY = {
  secure_url: "https://res.cloudinary.com/demo/image/upload/producto.webp",
  bytes: 68000,
  width: 1080,
  height: 720,
  format: "webp",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(obtenerEntornoServidor).mockReturnValue(ENTORNO_FAKE as never);
});

describe("subirImagenComoWebp", () => {
  it("configura Cloudinary con las credenciales del entorno servidor antes de subir", async () => {
    vi.mocked(cloudinary.uploader.upload).mockResolvedValue(RESPUESTA_CLOUDINARY as never);

    await subirImagenComoWebp("https://origen.com/foto.jpg", OPCIONES);

    expect(cloudinary.config).toHaveBeenCalledWith({
      cloud_name: "demo",
      api_key: "clave-api",
      api_secret: "secreto-api",
      secure: true,
    });
  });

  it("sube una cadena (URL/data URI) con transformación webp, ancho máximo y quality auto:eco", async () => {
    vi.mocked(cloudinary.uploader.upload).mockResolvedValue(RESPUESTA_CLOUDINARY as never);

    const resultado = await subirImagenComoWebp("https://origen.com/foto.jpg", OPCIONES);

    expect(resultado).toEqual({
      ok: true,
      data: { url: RESPUESTA_CLOUDINARY.secure_url, bytes: 68000, ancho: 1080, alto: 720, formato: "webp" },
    });
    expect(cloudinary.uploader.upload).toHaveBeenCalledWith("https://origen.com/foto.jpg", {
      folder: "nodexa/productos",
      format: "webp",
      transformation: [
        { width: 1080, crop: "limit" },
        { fetch_format: "webp", quality: "auto:eco" },
      ],
    });
  });

  it("sube un Buffer a través de upload_stream con la misma transformación", async () => {
    const buffer = Buffer.from("contenido-de-prueba");
    const streamFalso = { end: vi.fn() };
    vi.mocked(cloudinary.uploader.upload_stream).mockImplementation(((opciones: unknown, callback: (error: unknown, resultado: unknown) => void) => {
      expect(opciones).toEqual({
        folder: "nodexa/productos",
        format: "webp",
        transformation: [
          { width: 1080, crop: "limit" },
          { fetch_format: "webp", quality: "auto:eco" },
        ],
      });
      queueMicrotask(() => callback(undefined, { ...RESPUESTA_CLOUDINARY, bytes: 65000 }));
      return streamFalso;
    }) as unknown as typeof cloudinary.uploader.upload_stream);

    const resultado = await subirImagenComoWebp(buffer, OPCIONES);

    expect(resultado.ok && resultado.data.bytes).toBe(65000);
    expect(streamFalso.end).toHaveBeenCalledWith(buffer);
  });

  it("retorna NX-PRD-005 si Cloudinary rechaza la subida de una cadena", async () => {
    vi.mocked(cloudinary.uploader.upload).mockRejectedValue(new Error("Invalid API key"));

    const resultado = await subirImagenComoWebp("https://origen.com/foto.jpg", OPCIONES);

    expect(resultado).toEqual({ ok: false, error: "NX-PRD-005" });
  });

  it("retorna NX-PRD-005 si upload_stream falla al subir un Buffer", async () => {
    const streamFalso = { end: vi.fn() };
    vi.mocked(cloudinary.uploader.upload_stream).mockImplementation(((_opciones: unknown, callback: (error: unknown, resultado: unknown) => void) => {
      queueMicrotask(() => callback(new Error("timeout de red"), undefined));
      return streamFalso;
    }) as unknown as typeof cloudinary.uploader.upload_stream);

    const resultado = await subirImagenComoWebp(Buffer.from("x"), OPCIONES);

    expect(resultado).toEqual({ ok: false, error: "NX-PRD-005" });
  });

  it("retorna NX-PRD-005 si las credenciales de entorno no están configuradas", async () => {
    vi.mocked(obtenerEntornoServidor).mockImplementation(() => {
      throw new Error("Configuración de entorno inválida.");
    });

    const resultado = await subirImagenComoWebp("https://origen.com/foto.jpg", OPCIONES);

    expect(resultado).toEqual({ ok: false, error: "NX-PRD-005" });
    expect(cloudinary.uploader.upload).not.toHaveBeenCalled();
  });
});
