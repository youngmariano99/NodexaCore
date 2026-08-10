import { describe, expect, it } from "vitest";

import {
  UMBRAL_AVISO_SKU_PORCENTAJE,
  calcularPorcentajeUsoSku,
  debeMostrarAvisoLimiteSku,
} from "./calcularPorcentajeUsoSku";

describe("calcularPorcentajeUsoSku", () => {
  it("retorna 0 cuando no hay productos activos", () => {
    expect(calcularPorcentajeUsoSku(0, 1000)).toBe(0);
  });

  it("retorna 89 con 890 activos sobre un límite de 1000", () => {
    expect(calcularPorcentajeUsoSku(890, 1000)).toBe(89);
  });

  it("retorna 90 exactamente con 900 activos sobre un límite de 1000", () => {
    expect(calcularPorcentajeUsoSku(900, 1000)).toBe(90);
  });

  it("retorna 100 cuando los activos igualan el límite", () => {
    expect(calcularPorcentajeUsoSku(1000, 1000)).toBe(100);
  });

  it("redondea al entero más cercano para límites que no dan un porcentaje exacto", () => {
    expect(calcularPorcentajeUsoSku(1, 3)).toBe(33);
  });

  it("retorna 0 en vez de Infinity/NaN si el límite es cero o negativo", () => {
    expect(calcularPorcentajeUsoSku(50, 0)).toBe(0);
    expect(calcularPorcentajeUsoSku(50, -10)).toBe(0);
  });
});

describe("debeMostrarAvisoLimiteSku", () => {
  it(`no muestra la banda por debajo del ${UMBRAL_AVISO_SKU_PORCENTAJE}%`, () => {
    expect(debeMostrarAvisoLimiteSku(89)).toBe(false);
  });

  it(`muestra la banda exactamente al ${UMBRAL_AVISO_SKU_PORCENTAJE}%`, () => {
    expect(debeMostrarAvisoLimiteSku(90)).toBe(true);
  });

  it("sigue mostrando la banda al 100% (el bloqueo real vive en crearProducto, no acá)", () => {
    expect(debeMostrarAvisoLimiteSku(100)).toBe(true);
  });
});
