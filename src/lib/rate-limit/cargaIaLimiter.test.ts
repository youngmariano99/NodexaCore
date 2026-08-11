import { beforeEach, describe, expect, it, vi } from "vitest";

const { limitMock, redisConstructorMock, ratelimitConstructorMock, slidingWindowMock } = vi.hoisted(() => ({
  limitMock: vi.fn(),
  redisConstructorMock: vi.fn(),
  ratelimitConstructorMock: vi.fn(),
  slidingWindowMock: vi.fn((tokens: number, window: string) => ({ tokens, window })),
}));

// El paquete "server-only" lanza al importarse fuera de un bundle de Next.js
// server-side; se stubea para poder importar el módulo real bajo test en Node.
vi.mock("server-only", () => ({}));

vi.mock("@upstash/redis", () => ({
  Redis: function Redis(config: unknown) {
    redisConstructorMock(config);
    return { __config: config };
  },
}));

vi.mock("@upstash/ratelimit", () => {
  function Ratelimit(config: unknown) {
    ratelimitConstructorMock(config);
    return { limit: limitMock };
  }
  (Ratelimit as unknown as { slidingWindow: typeof slidingWindowMock }).slidingWindow = slidingWindowMock;
  return { Ratelimit };
});

vi.mock("@/lib/env", () => ({
  obtenerEntornoServidor: vi.fn(() => ({
    UPSTASH_REDIS_REST_URL: "https://fake-instancia.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "token-de-prueba",
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe("verificarCargaIaLimiter", () => {
  it("configura una ventana deslizante de 5 subidas cada 1 minuto", async () => {
    limitMock.mockResolvedValue({ success: true, remaining: 4, reset: Date.now() + 30_000 });

    const { verificarCargaIaLimiter } = await import("./cargaIaLimiter");
    await verificarCargaIaLimiter("b2222222-2222-4222-8222-222222222222");

    expect(slidingWindowMock).toHaveBeenCalledWith(5, "1 m");
  });

  it("usa el cliente_id como clave, sin mezclar comercios", async () => {
    limitMock.mockResolvedValue({ success: true, remaining: 4, reset: Date.now() + 30_000 });

    const { verificarCargaIaLimiter } = await import("./cargaIaLimiter");
    await verificarCargaIaLimiter("cliente-a");
    await verificarCargaIaLimiter("cliente-b");

    expect(limitMock).toHaveBeenNthCalledWith(1, "cliente-a");
    expect(limitMock).toHaveBeenNthCalledWith(2, "cliente-b");
  });

  it("permite la operación mientras no se agotó el límite", async () => {
    limitMock.mockResolvedValue({ success: true, remaining: 2, reset: Date.now() + 10_000 });

    const { verificarCargaIaLimiter } = await import("./cargaIaLimiter");
    const resultado = await verificarCargaIaLimiter("cliente-a");

    expect(resultado.permitido).toBe(true);
  });

  it("bloquea al agotarse el límite", async () => {
    limitMock.mockResolvedValue({ success: false, remaining: 0, reset: Date.now() + 60_000 });

    const { verificarCargaIaLimiter } = await import("./cargaIaLimiter");
    const resultado = await verificarCargaIaLimiter("cliente-a");

    expect(resultado.permitido).toBe(false);
    expect(resultado.reintentarEnSegundos).toBeGreaterThan(0);
  });

  it("reutiliza la misma instancia de Ratelimit/Redis entre llamadas (memoización perezosa)", async () => {
    limitMock.mockResolvedValue({ success: true, remaining: 4, reset: Date.now() + 30_000 });

    const { verificarCargaIaLimiter } = await import("./cargaIaLimiter");
    await verificarCargaIaLimiter("cliente-a");
    await verificarCargaIaLimiter("cliente-b");

    expect(redisConstructorMock).toHaveBeenCalledTimes(1);
    expect(ratelimitConstructorMock).toHaveBeenCalledTimes(1);
  });
});
