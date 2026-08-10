import { describe, expect, it } from "vitest";

import { calcularSubtotalItem, calcularTotalVenta, type VentaItem } from "./calcularTotalVenta";

describe("calcularTotalVenta", () => {
  it("retorna 0 con un arreglo vacío, sin lanzar excepción", () => {
    expect(() => calcularTotalVenta([])).not.toThrow();
    expect(calcularTotalVenta([])).toBe(0);
  });

  it("suma un único ítem (precio * cantidad)", () => {
    const items: VentaItem[] = [{ productoId: "p-1", precioUnitario: 3500, cantidad: 2 }];

    expect(calcularTotalVenta(items)).toBe(7000);
  });

  it("suma múltiples ítems con distintas cantidades y precios", () => {
    const items: VentaItem[] = [
      { productoId: "p-1", precioUnitario: 3500, cantidad: 2 }, // 7000
      { productoId: "p-2", precioUnitario: 900.5, cantidad: 3 }, // 2701.5
      { productoId: "p-3", precioUnitario: 120.25, cantidad: 1 }, // 120.25
    ];

    expect(calcularTotalVenta(items)).toBeCloseTo(9821.75, 2);
  });

  it("no arrastra el error clásico de redondeo binario de punto flotante (19.99 * 5 = 99.95 exacto)", () => {
    const items: VentaItem[] = [{ productoId: "p-1", precioUnitario: 19.99, cantidad: 5 }];

    // Referencia del bug que se evita: 19.99 * 5 en JS puro da 99.94999999999999.
    expect(19.99 * 5).not.toBe(99.95);
    expect(calcularTotalVenta(items)).toBe(99.95);
  });

  it("no arrastra deriva de centavos al sumar muchos ítems con precios problemáticos en punto flotante", () => {
    const items: VentaItem[] = Array.from({ length: 10 }, (_, indice) => ({
      productoId: `p-${indice}`,
      precioUnitario: 0.1,
      cantidad: 1,
    }));

    // Referencia del bug: sumar 0.1 diez veces en JS puro da 0.9999999999999999.
    const sumaFlotanteIngenua = items.reduce((total, item) => total + item.precioUnitario, 0);
    expect(sumaFlotanteIngenua).not.toBe(1);

    expect(calcularTotalVenta(items)).toBe(1);
  });

  it("redondea cada línea a numeric(12,2) antes de sumar (media unidad de centavo redondea hacia arriba)", () => {
    const items: VentaItem[] = [{ productoId: "p-1", precioUnitario: 10.005, cantidad: 1 }];

    expect(calcularTotalVenta(items)).toBe(10.01);
  });

  it("acepta precio cero sin romperse (producto gratuito, precio >= 0 según docs/SCHEMA.md §5)", () => {
    const items: VentaItem[] = [
      { productoId: "p-1", precioUnitario: 0, cantidad: 3 },
      { productoId: "p-2", precioUnitario: 100, cantidad: 1 },
    ];

    expect(calcularTotalVenta(items)).toBe(100);
  });

  it("es pura: invocada dos veces con el mismo input siempre retorna el mismo output", () => {
    const items: VentaItem[] = [
      { productoId: "p-1", precioUnitario: 3500, cantidad: 2 },
      { productoId: "p-2", precioUnitario: 900.5, cantidad: 3 },
    ];

    const primeraLlamada = calcularTotalVenta(items);
    const segundaLlamada = calcularTotalVenta(items);

    expect(primeraLlamada).toBe(segundaLlamada);
  });

  it("no muta el arreglo de ítems recibido (sin efectos secundarios)", () => {
    const items: VentaItem[] = [{ productoId: "p-1", precioUnitario: 3500, cantidad: 2 }];
    const copiaOriginal = structuredClone(items);

    calcularTotalVenta(items);

    expect(items).toEqual(copiaOriginal);
  });

  it("el total coincide exactamente con la suma de los subtotales por línea ya redondeados", () => {
    const items: VentaItem[] = [
      { productoId: "p-1", precioUnitario: 19.99, cantidad: 5 },
      { productoId: "p-2", precioUnitario: 900.5, cantidad: 3 },
      { productoId: "p-3", precioUnitario: 10.005, cantidad: 1 },
    ];

    const sumaDeSubtotales = items.reduce((total, item) => total + calcularSubtotalItem(item), 0);

    expect(calcularTotalVenta(items)).toBeCloseTo(sumaDeSubtotales, 10);
  });
});

describe("calcularSubtotalItem", () => {
  it("multiplica precio_unitario por cantidad", () => {
    expect(calcularSubtotalItem({ productoId: "p-1", precioUnitario: 3500, cantidad: 2 })).toBe(7000);
  });

  it("redondea a dos decimales (numeric(12,2))", () => {
    expect(calcularSubtotalItem({ productoId: "p-1", precioUnitario: 19.99, cantidad: 5 })).toBe(99.95);
  });
});
