import { describe, expect, it } from "vitest";

import { cuotaIaAgotada } from "./validarCuotaIa";

describe("cuotaIaAgotada", () => {
  it("retorna true cuando ia_consultas_usadas iguala la cuota mensual (caso límite exacto)", () => {
    expect(cuotaIaAgotada(40, 40)).toBe(true);
  });

  it("retorna true cuando ia_consultas_usadas supera la cuota mensual", () => {
    expect(cuotaIaAgotada(41, 40)).toBe(true);
  });

  it("retorna false cuando queda cupo disponible", () => {
    expect(cuotaIaAgotada(34, 40)).toBe(false);
  });

  it("retorna false al inicio del período (0 usadas)", () => {
    expect(cuotaIaAgotada(0, 40)).toBe(false);
  });
});
