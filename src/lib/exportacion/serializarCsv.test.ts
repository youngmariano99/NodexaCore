import { describe, expect, it } from "vitest";

import { serializarCsv } from "./serializarCsv";

describe("serializarCsv", () => {
  it("arma el encabezado exacto en la primera línea", () => {
    const csv = serializarCsv(["a", "b"], []);

    expect(csv).toBe("a,b");
  });

  it("serializa filas en el orden dado, separadas por CRLF", () => {
    const csv = serializarCsv(["a", "b"], [["1", "2"], ["3", "4"]]);

    expect(csv).toBe("a,b\r\n1,2\r\n3,4");
  });

  it("envuelve entre comillas un campo que contiene una coma", () => {
    const csv = serializarCsv(["nombre"], [["Tornillo, 1/2 pulgada"]]);

    expect(csv).toBe('nombre\r\n"Tornillo, 1/2 pulgada"');
  });

  it("duplica las comillas internas de un campo que ya contiene comillas", () => {
    const csv = serializarCsv(["nombre"], [['Producto "Premium"']]);

    expect(csv).toBe('nombre\r\n"Producto ""Premium"""');
  });

  it("envuelve entre comillas un campo que contiene un salto de línea", () => {
    const csv = serializarCsv(["nota"], [["línea 1\nlínea 2"]]);

    expect(csv).toBe('nota\r\n"línea 1\nlínea 2"');
  });

  it("no envuelve entre comillas un campo simple sin caracteres especiales", () => {
    const csv = serializarCsv(["sku"], [["FT-00068"]]);

    expect(csv).toBe("sku\r\nFT-00068");
  });
});
