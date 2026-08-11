import { describe, expect, it } from "vitest";

import {
  calcularCostoPackSku,
  calcularCostoPacksSkuAgregados,
  COSTO_MINIMO_PACK_SKU_ARS,
} from "./calcularCostoPackSku";

describe("calcularCostoPackSku", () => {
  it("el pack 1 cuesta $5.000", () => {
    expect(calcularCostoPackSku(1)).toBe(5000);
  });

  it("el pack 2 cuesta $4.000 (costo marginal decreciente)", () => {
    expect(calcularCostoPackSku(2)).toBe(4000);
  });

  it("el pack 3 cuesta $3.000", () => {
    expect(calcularCostoPackSku(3)).toBe(3000);
  });

  it("el pack 4 toca el piso de $2.000", () => {
    expect(calcularCostoPackSku(4)).toBe(2000);
  });

  it("el pack 10 no baja del piso de $2.000", () => {
    expect(calcularCostoPackSku(10)).toBe(COSTO_MINIMO_PACK_SKU_ARS);
  });

  it("lanza RangeError con numeroPack menor a 1", () => {
    expect(() => calcularCostoPackSku(0)).toThrow(RangeError);
  });

  it("lanza RangeError con numeroPack no entero", () => {
    expect(() => calcularCostoPackSku(1.5)).toThrow(RangeError);
  });
});

describe("calcularCostoPacksSkuAgregados", () => {
  it("primera ampliación (0 packs previos, 1 pack agregado) = $5.000", () => {
    expect(calcularCostoPacksSkuAgregados(0, 1)).toBe(5000);
  });

  it("segunda ampliación (1 pack previo, 1 pack agregado) = $4.000", () => {
    expect(calcularCostoPacksSkuAgregados(1, 1)).toBe(4000);
  });

  it("ampliación que salta de 1000 a 3000 SKU en un solo pedido (0 previos, 2 agregados) = $5.000 + $4.000 = $9.000", () => {
    expect(calcularCostoPacksSkuAgregados(0, 2)).toBe(9000);
  });

  it("retorna 0 sin packs agregados", () => {
    expect(calcularCostoPacksSkuAgregados(3, 0)).toBe(0);
  });
});
