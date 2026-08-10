import * as Sentry from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { subirImagenComoWebp } from "@/repositories/imagenesRepository";

import { ANCHO_MAXIMO_PX, PESO_OBJETIVO_BYTES, comprimirImagenProducto } from "./comprimirImagen";

vi.mock("@/repositories/imagenesRepository", () => ({
  subirImagenComoWebp: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("comprimirImagenProducto", () => {
  it("sube la imagen a la carpeta de productos con el ancho máximo de 1080px", async () => {
    vi.mocked(subirImagenComoWebp).mockResolvedValue({
      ok: true,
      data: { url: "https://res.cloudinary.com/demo/producto.webp", bytes: 68000, ancho: 1080, alto: 720, formato: "webp" },
    });

    await comprimirImagenProducto("https://origen.com/foto.jpg");

    expect(subirImagenComoWebp).toHaveBeenCalledWith("https://origen.com/foto.jpg", {
      carpeta: "nodexa/productos",
      anchoMaximo: ANCHO_MAXIMO_PX,
    });
  });

  it("retorna la imagen comprimida cuando el peso final está dentro del objetivo (~70KB)", async () => {
    vi.mocked(subirImagenComoWebp).mockResolvedValue({
      ok: true,
      data: { url: "https://res.cloudinary.com/demo/producto.webp", bytes: PESO_OBJETIVO_BYTES - 2000, ancho: 1080, alto: 720, formato: "webp" },
    });

    const resultado = await comprimirImagenProducto(Buffer.from("imagen"));

    expect(resultado).toEqual({
      ok: true,
      data: { url: "https://res.cloudinary.com/demo/producto.webp", bytes: PESO_OBJETIVO_BYTES - 2000, ancho: 1080, alto: 720 },
    });
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("propaga NX-PRD-005 sin romper el flujo si Cloudinary falla, sin reportar a Sentry", async () => {
    vi.mocked(subirImagenComoWebp).mockResolvedValue({ ok: false, error: "NX-PRD-005" });

    const resultado = await comprimirImagenProducto("https://origen.com/foto.jpg");

    expect(resultado).toEqual({ ok: false, error: "NX-PRD-005" });
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("no bloquea el alta cuando el peso final supera significativamente el objetivo, pero lo reporta a Sentry", async () => {
    const bytesExcedidos = Math.ceil(PESO_OBJETIVO_BYTES * 1.5) + 1;
    vi.mocked(subirImagenComoWebp).mockResolvedValue({
      ok: true,
      data: { url: "https://res.cloudinary.com/demo/producto.webp", bytes: bytesExcedidos, ancho: 1080, alto: 1350, formato: "webp" },
    });

    const resultado = await comprimirImagenProducto(Buffer.from("imagen-grande"));

    expect(resultado).toEqual({
      ok: true,
      data: { url: "https://res.cloudinary.com/demo/producto.webp", bytes: bytesExcedidos, ancho: 1080, alto: 1350 },
    });
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "Imagen de producto comprimida supera significativamente el peso objetivo de 70KB",
      expect.objectContaining({ level: "warning" }),
    );
  });

  it("no reporta a Sentry cuando el peso está apenas por encima del objetivo pero dentro de la tolerancia", async () => {
    vi.mocked(subirImagenComoWebp).mockResolvedValue({
      ok: true,
      data: { url: "https://res.cloudinary.com/demo/producto.webp", bytes: PESO_OBJETIVO_BYTES + 5000, ancho: 1080, alto: 800, formato: "webp" },
    });

    await comprimirImagenProducto("https://origen.com/foto.jpg");

    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });
});
