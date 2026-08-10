import { describe, expect, it } from "vitest";

import { ESTADO_CARRITO_INICIAL, reducirCarrito, type ItemCarrito, type ProductoParaCarrito } from "./carritoReducer";

const YERBA: ProductoParaCarrito = {
  productoId: "p-1",
  sku: "DP-00001",
  nombre: "Yerba Mate 1kg",
  precio: 3500,
  stockDisponible: 3,
};

const FIDEOS: ProductoParaCarrito = {
  productoId: "p-2",
  sku: "DP-00002",
  nombre: "Fideos 500g",
  precio: 900,
  stockDisponible: 10,
};

describe("reducirCarrito", () => {
  it("agrega un producto nuevo con cantidad 1", () => {
    const estado = reducirCarrito(ESTADO_CARRITO_INICIAL, { tipo: "AGREGAR_PRODUCTO", producto: YERBA });

    expect(estado).toEqual([{ ...YERBA, cantidad: 1 }]);
  });

  it("incrementa la cantidad al agregar un producto ya presente en el carrito", () => {
    const conYerba: ItemCarrito[] = [{ ...YERBA, cantidad: 1 }];

    const estado = reducirCarrito(conYerba, { tipo: "AGREGAR_PRODUCTO", producto: YERBA });

    expect(estado).toEqual([{ ...YERBA, cantidad: 2 }]);
  });

  it("no agrega un producto sin stock disponible", () => {
    const sinStock: ProductoParaCarrito = { ...YERBA, stockDisponible: 0 };

    const estado = reducirCarrito(ESTADO_CARRITO_INICIAL, { tipo: "AGREGAR_PRODUCTO", producto: sinStock });

    expect(estado).toEqual([]);
  });

  it("no supera el stock disponible al agregar repetidamente el mismo producto (tope en 3)", () => {
    let estado: ItemCarrito[] = ESTADO_CARRITO_INICIAL;
    for (let intento = 0; intento < 5; intento += 1) {
      estado = reducirCarrito(estado, { tipo: "AGREGAR_PRODUCTO", producto: YERBA });
    }

    expect(estado).toEqual([{ ...YERBA, cantidad: 3 }]);
  });

  it("incrementa la cantidad de un ítem existente respetando el tope de stock", () => {
    const casiAgotado: ItemCarrito[] = [{ ...YERBA, cantidad: 2 }];

    const unaVezMas = reducirCarrito(casiAgotado, { tipo: "INCREMENTAR_CANTIDAD", productoId: YERBA.productoId });
    expect(unaVezMas).toEqual([{ ...YERBA, cantidad: 3 }]);

    const enElTope = reducirCarrito(unaVezMas, { tipo: "INCREMENTAR_CANTIDAD", productoId: YERBA.productoId });
    expect(enElTope).toEqual([{ ...YERBA, cantidad: 3 }]);
  });

  it("decrementa la cantidad de un ítem existente", () => {
    const conDos: ItemCarrito[] = [{ ...YERBA, cantidad: 2 }];

    const estado = reducirCarrito(conDos, { tipo: "DECREMENTAR_CANTIDAD", productoId: YERBA.productoId });

    expect(estado).toEqual([{ ...YERBA, cantidad: 1 }]);
  });

  it("quita el ítem del carrito cuando la cantidad decrementada llega a cero", () => {
    const conUno: ItemCarrito[] = [{ ...YERBA, cantidad: 1 }];

    const estado = reducirCarrito(conUno, { tipo: "DECREMENTAR_CANTIDAD", productoId: YERBA.productoId });

    expect(estado).toEqual([]);
  });

  it("quita un producto del carrito sin importar su cantidad", () => {
    const conVarios: ItemCarrito[] = [
      { ...YERBA, cantidad: 3 },
      { ...FIDEOS, cantidad: 1 },
    ];

    const estado = reducirCarrito(conVarios, { tipo: "QUITAR_PRODUCTO", productoId: YERBA.productoId });

    expect(estado).toEqual([{ ...FIDEOS, cantidad: 1 }]);
  });

  it("vacía completamente el carrito", () => {
    const conVarios: ItemCarrito[] = [
      { ...YERBA, cantidad: 3 },
      { ...FIDEOS, cantidad: 1 },
    ];

    const estado = reducirCarrito(conVarios, { tipo: "VACIAR_CARRITO" });

    expect(estado).toEqual([]);
  });
});
