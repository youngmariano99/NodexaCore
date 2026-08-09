/**
 * Prueba de integración (docs actividad Paso 4): ejercita iniciarSesion() ya
 * integrado con el guard de rate limiting, no en aislamiento. Solo se
 * stubean los límites externos (Supabase, el limiter y next/navigation);
 * la lógica de la Server Action corre real.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { verificarAuthLimiter } from "@/lib/rate-limit/authLimiter";
import { obtenerIpSolicitante } from "@/lib/rate-limit/obtenerIpSolicitante";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

import { iniciarSesion } from "./iniciarSesion";
import { ESTADO_LOGIN_INICIAL } from "./tipos";

vi.mock("@/lib/supabase/server", () => ({
  crearClienteSupabaseServidor: vi.fn(),
}));

vi.mock("@/lib/rate-limit/authLimiter", () => ({
  verificarAuthLimiter: vi.fn(),
}));

vi.mock("@/lib/rate-limit/obtenerIpSolicitante", () => ({
  obtenerIpSolicitante: vi.fn(async () => "200.1.2.3"),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

function crearFormData(campos: Record<string, string>): FormData {
  const formData = new FormData();
  Object.entries(campos).forEach(([clave, valor]) => formData.set(clave, valor));
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("iniciarSesion — rate limiting", () => {
  it("corta con NX-SYS-005 sin llamar a Supabase Auth cuando el limiter bloquea (6to intento)", async () => {
    vi.mocked(verificarAuthLimiter).mockResolvedValue({ permitido: false, restantes: 0, reintentarEnSegundos: 900 });

    const formData = crearFormData({ email: "comerciante@demo.com", password: "NodexaDemo123!" });
    const resultado = await iniciarSesion(ESTADO_LOGIN_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-005" });
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("consulta el limiter con la clave IP+email antes de tocar Supabase", async () => {
    vi.mocked(verificarAuthLimiter).mockResolvedValue({ permitido: false, restantes: 0, reintentarEnSegundos: 900 });

    const formData = crearFormData({ email: "comerciante@demo.com", password: "x" });
    await iniciarSesion(ESTADO_LOGIN_INICIAL, formData);

    expect(obtenerIpSolicitante).toHaveBeenCalled();
    expect(verificarAuthLimiter).toHaveBeenCalledWith("200.1.2.3", "comerciante@demo.com");
  });

  it("no ejecuta el rate limiter si el email no pasa la validación de Zod", async () => {
    const formData = crearFormData({ email: "no-es-un-email", password: "x" });
    const resultado = await iniciarSesion(ESTADO_LOGIN_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-006" });
    expect(verificarAuthLimiter).not.toHaveBeenCalled();
  });

  it("permite el login normalmente una vez que el limiter ya no bloquea (ventana vencida)", async () => {
    vi.mocked(verificarAuthLimiter).mockResolvedValue({ permitido: true, restantes: 5, reintentarEnSegundos: 0 });

    const supabaseMock = {
      auth: {
        signInWithPassword: vi.fn(async () => ({ data: { user: { id: "auth-1" } }, error: null })),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn(async () => ({ data: { rol: "comerciante" }, error: null })),
      })),
    };
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const { redirect } = await import("next/navigation");
    const formData = crearFormData({ email: "comerciante@demo.com", password: "NodexaDemo123!" });

    await expect(iniciarSesion(ESTADO_LOGIN_INICIAL, formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });
});
