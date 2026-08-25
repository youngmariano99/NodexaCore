import { describe, expect, it } from "vitest";

import { generarMatrizCombinaciones } from "./generarMatrizCombinaciones";

describe("generarMatrizCombinaciones", () => {
  it("genera una sola fila cuando no hay dimensiones", () => {
    const resultado = generarMatrizCombinaciones([], "SKU-PADRE", 1500, 5);

    expect(resultado).toEqual([
      {
        combinacion: {},
        sku: "SKU-PADRE",
        stock: 5,
        precio: 1500,
      },
    ]);
  });

  it("genera producto cartesiano correcto (ej: 3 talles x 2 colores = 6 variantes) con sufijos de SKU y stock por defecto", () => {
    const dimensiones = [
      { nombre: "Talle", valores: ["S", "M", "L"] },
      { nombre: "Color", valores: ["Rojo", "Azul"] },
    ];

    const resultado = generarMatrizCombinaciones(dimensiones, "CAMISA", 3500, 10);

    expect(resultado).toHaveLength(6);
    expect(resultado[0]).toEqual({
      combinacion: { Talle: "S", Color: "Rojo" },
      sku: "CAMISA-S-ROJO",
      stock: 10,
      precio: 3500,
    });
    expect(resultado[5]).toEqual({
      combinacion: { Talle: "L", Color: "Azul" },
      sku: "CAMISA-L-AZUL",
      stock: 10,
      precio: 3500,
    });
  });
});
