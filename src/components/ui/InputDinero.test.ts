import { describe, it, expect } from "vitest";
import { formatearMascaraMoneda, desformatearMascaraMoneda } from "./InputDinero";

describe("formatearMascaraMoneda y desformatearMascaraMoneda", () => {
  it("debe formatear números enteros con puntos de miles", () => {
    expect(formatearMascaraMoneda(1250000)).toBe("1.250.000");
    expect(formatearMascaraMoneda("3500")).toBe("3.500");
    expect(formatearMascaraMoneda("0")).toBe("0");
  });

  it("debe formatear números con coma decimal", () => {
    expect(formatearMascaraMoneda("3500,50")).toBe("3.500,50");
    expect(formatearMascaraMoneda("1250.50")).toBe("1.250,50");
  });

  it("debe desformatear números correctamente", () => {
    expect(desformatearMascaraMoneda("1.250.000")).toBe(1250000);
    expect(desformatearMascaraMoneda("3.500,50")).toBe(3500.5);
    expect(desformatearMascaraMoneda("")).toBe(0);
  });
});
