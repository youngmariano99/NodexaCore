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

describe("verificarAuthLimiter", () => {
  it("configura una ventana deslizante de 5 intentos cada 15 minutos", async () => {
    limitMock.mockResolvedValue({ success: true, remaining: 4, reset: Date.now() + 60_000 });

    const { verificarAuthLimiter } = await import("./authLimiter");
    await verificarAuthLimiter("200.1.2.3", "comerciante@demo.com");

    expect(slidingWindowMock).toHaveBeenCalledWith(5, "15 m");
  });

  it("compone la clave como ip:email en minúsculas, sin espacios", async () => {
    limitMock.mockResolvedValue({ success: true, remaining: 4, reset: Date.now() + 60_000 });

    const { verificarAuthLimiter } = await import("./authLimiter");
    await verificarAuthLimiter("200.1.2.3", "  Comerciante@Demo.com  ");

    expect(limitMock).toHaveBeenCalledWith("200.1.2.3:comerciante@demo.com");
  });

  it("permite la operación mientras no se agotó el límite", async () => {
    limitMock.mockResolvedValue({ success: true, remaining: 2, reset: Date.now() + 30_000 });

    const { verificarAuthLimiter } = await import("./authLimiter");
    const resultado = await verificarAuthLimiter("200.1.2.3", "comerciante@demo.com");

    expect(resultado.permitido).toBe(true);
  });

  it("bloquea al agotarse el límite (6to intento)", async () => {
    limitMock.mockResolvedValue({ success: false, remaining: 0, reset: Date.now() + 900_000 });

    const { verificarAuthLimiter } = await import("./authLimiter");
    const resultado = await verificarAuthLimiter("200.1.2.3", "comerciante@demo.com");

    expect(resultado.permitido).toBe(false);
    expect(resultado.reintentarEnSegundos).toBeGreaterThan(0);
  });

  it("aísla el límite por clave compuesta IP+email: dos emails distintos desde la misma IP no se pisan", async () => {
    limitMock.mockResolvedValue({ success: true, remaining: 4, reset: Date.now() + 60_000 });

    const { verificarAuthLimiter } = await import("./authLimiter");
    await verificarAuthLimiter("200.1.2.3", "usuario-a@demo.com");
    await verificarAuthLimiter("200.1.2.3", "usuario-b@demo.com");

    expect(limitMock).toHaveBeenNthCalledWith(1, "200.1.2.3:usuario-a@demo.com");
    expect(limitMock).toHaveBeenNthCalledWith(2, "200.1.2.3:usuario-b@demo.com");
  });

  it("reutiliza la misma instancia de Ratelimit/Redis entre llamadas (memoización perezosa)", async () => {
    limitMock.mockResolvedValue({ success: true, remaining: 4, reset: Date.now() + 60_000 });

    const { verificarAuthLimiter } = await import("./authLimiter");
    await verificarAuthLimiter("200.1.2.3", "a@demo.com");
    await verificarAuthLimiter("200.1.2.3", "b@demo.com");

    expect(redisConstructorMock).toHaveBeenCalledTimes(1);
    expect(ratelimitConstructorMock).toHaveBeenCalledTimes(1);
  });
});
