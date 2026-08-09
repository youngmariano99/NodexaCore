import { beforeEach, describe, expect, it, vi } from "vitest";

import { verificarAuthLimiter } from "@/lib/rate-limit/authLimiter";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

import { recuperarContrasena } from "./recuperarContrasena";
import { ESTADO_RECUPERAR_CONTRASENA_INICIAL } from "./tipos";

vi.mock("@/lib/supabase/server", () => ({
  crearClienteSupabaseServidor: vi.fn(),
}));

vi.mock("@/lib/rate-limit/authLimiter", () => ({
  verificarAuthLimiter: vi.fn(),
}));

vi.mock("@/lib/rate-limit/obtenerIpSolicitante", () => ({
  obtenerIpSolicitante: vi.fn(async () => "200.1.2.3"),
}));

function crearFormData(campos: Record<string, string>): FormData {
  const formData = new FormData();
  Object.entries(campos).forEach(([clave, valor]) => formData.set(clave, valor));
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("recuperarContrasena", () => {
  it("corta con NX-SYS-005 sin llamar a Supabase Auth cuando el limiter bloquea", async () => {
    vi.mocked(verificarAuthLimiter).mockResolvedValue({ permitido: false, restantes: 0, reintentarEnSegundos: 900 });

    const formData = crearFormData({ email: "comerciante@demo.com" });
    const resultado = await recuperarContrasena(ESTADO_RECUPERAR_CONTRASENA_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-005", enviado: false });
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it("comparte la misma clave compuesta IP+email que el login", async () => {
    vi.mocked(verificarAuthLimiter).mockResolvedValue({ permitido: false, restantes: 0, reintentarEnSegundos: 900 });

    const formData = crearFormData({ email: "comerciante@demo.com" });
    await recuperarContrasena(ESTADO_RECUPERAR_CONTRASENA_INICIAL, formData);

    expect(verificarAuthLimiter).toHaveBeenCalledWith("200.1.2.3", "comerciante@demo.com");
  });

  it("envía el link y responde enviado:true cuando el limiter lo permite", async () => {
    vi.mocked(verificarAuthLimiter).mockResolvedValue({ permitido: true, restantes: 4, reintentarEnSegundos: 0 });

    const resetPasswordForEmail = vi.fn(async () => ({ data: {}, error: null }));
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue({
      auth: { resetPasswordForEmail },
    } as never);

    const formData = crearFormData({ email: "comerciante@demo.com" });
    const resultado = await recuperarContrasena(ESTADO_RECUPERAR_CONTRASENA_INICIAL, formData);

    expect(resetPasswordForEmail).toHaveBeenCalledWith("comerciante@demo.com");
    expect(resultado).toEqual({ error: null, enviado: true });
  });

  it("responde enviado:true incluso si el email no existe en Supabase (evita enumeración de usuarios)", async () => {
    vi.mocked(verificarAuthLimiter).mockResolvedValue({ permitido: true, restantes: 4, reintentarEnSegundos: 0 });

    const resetPasswordForEmail = vi.fn(async () => ({ data: null, error: { message: "User not found" } }));
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue({
      auth: { resetPasswordForEmail },
    } as never);

    const formData = crearFormData({ email: "no-registrado@demo.com" });
    const resultado = await recuperarContrasena(ESTADO_RECUPERAR_CONTRASENA_INICIAL, formData);

    expect(resultado).toEqual({ error: null, enviado: true });
  });

  it("rechaza un email inválido con NX-SYS-006 sin consultar el limiter", async () => {
    const formData = crearFormData({ email: "no-es-un-email" });
    const resultado = await recuperarContrasena(ESTADO_RECUPERAR_CONTRASENA_INICIAL, formData);

    expect(resultado).toEqual({ error: "NX-SYS-006", enviado: false });
    expect(verificarAuthLimiter).not.toHaveBeenCalled();
  });
});
