import { describe, expect, it } from "vitest";

import { filtrarDatosSensibles } from "./filtrar-datos-sensibles";

function crearEventoFalso() {
  return {
    request: {
      data: {
        password: "super-secreta-123",
        cliente_id: "1fd62cd4-eb75-49b9-99ff-a3e35cfad0de",
        nombre_comercio: "Demo Nodexa",
      },
      headers: { authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abc123def456" },
    },
    extra: { token: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abc123def456" },
    user: { clienteId: "debe-ser-redactado", email: "no-sensible@ejemplo.com" },
  } as never;
}

describe("filtrarDatosSensibles", () => {
  it("redacta password, cliente_id, authorization y tokens tipo JWT", () => {
    const resultado = filtrarDatosSensibles(crearEventoFalso());

    expect(resultado.request?.data).toMatchObject({
      password: "[REDACTADO]",
      cliente_id: "[REDACTADO]",
      nombre_comercio: "Demo Nodexa",
    });
    expect((resultado.request?.headers as Record<string, string>).authorization).toBe("[REDACTADO]");
    expect(resultado.extra?.token).toBe("[REDACTADO]");
  });

  it("redacta variantes de clave en camelCase (clienteId) sin tocar campos no sensibles", () => {
    const resultado = filtrarDatosSensibles(crearEventoFalso());

    expect(resultado.user?.clienteId).toBe("[REDACTADO]");
    expect(resultado.user?.email).toBe("no-sensible@ejemplo.com");
  });

  it("no falla con un evento vacío", () => {
    expect(() => filtrarDatosSensibles({} as never)).not.toThrow();
  });
});
