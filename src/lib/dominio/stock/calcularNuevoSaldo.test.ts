import { describe, expect, it } from "vitest";

import { ErrorDeDominio } from "@/lib/errores/mapearError";

import { calcularNuevoSaldo } from "./calcularNuevoSaldo";

describe("calcularNuevoSaldo", () => {
  it("suma la cantidad al saldo actual en una entrada (10 + 5 = 15)", () => {
    expect(calcularNuevoSaldo(10, 5, "entrada")).toBe(15);
  });

  it("resta la cantidad al saldo actual en una salida (10 - 4 = 6)", () => {
    expect(calcularNuevoSaldo(10, 4, "salida")).toBe(6);
  });

  it("permite que una salida deje el saldo en exactamente cero (caso límite)", () => {
    expect(calcularNuevoSaldo(10, 10, "salida")).toBe(0);
  });

  it("permite una entrada sobre un producto sin stock previo (0 + 20 = 20)", () => {
    expect(calcularNuevoSaldo(0, 20, "entrada")).toBe(20);
  });

  it("lanza un error de dominio ANTES de llegar a la base cuando la salida dejaría el saldo negativo", () => {
    expect(() => calcularNuevoSaldo(10, 15, "salida")).toThrow(ErrorDeDominio);
  });

  it("el error de dominio lanzado trae el código NX-PRD-004", () => {
    try {
      calcularNuevoSaldo(5, 6, "salida");
      expect.unreachable("calcularNuevoSaldo debía lanzar ErrorDeDominio");
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorDeDominio);
      expect((error as ErrorDeDominio).codigo).toBe("NX-PRD-004");
    }
  });

  it("lanza el mismo error de dominio cuando una salida sobre stock cero intenta descontar cualquier cantidad", () => {
    expect(() => calcularNuevoSaldo(0, 1, "salida")).toThrow(ErrorDeDominio);
  });
});
