import { describe, expect, it } from "vitest";
import { useCarritoCatalogo, type ReglaMetodoPago, type ZonaEnvio } from "./useCarritoCatalogo";

const ZONAS_MOCK: ZonaEnvio[] = [
  { id: "zona-centro", nombre: "Zona Centro", costo: 500 },
  { id: "zona-norte", nombre: "Zona Norte", costo: 800 },
];

const REGLAS_MOCK: ReglaMetodoPago[] = [
  { metodoPago: "efectivo", etiqueta: "Efectivo al retirar", tipoAjuste: "descuento", porcentaje: 10 },
  { metodoPago: "tarjeta", etiqueta: "Tarjeta de Crédito", tipoAjuste: "recargo", porcentaje: 5 },
  { metodoPago: "transferencia", etiqueta: "Transferencia Bancaria", tipoAjuste: "ninguno", porcentaje: 0 },
];

describe("useCarritoCatalogo Hook export", () => {
  it("se define correctamente", () => {
    expect(useCarritoCatalogo).toBeDefined();
    expect(typeof useCarritoCatalogo).toBe("function");
  });

  it("garantiza la estructura esperada en los datos mock de pago y zonas de envío", () => {
    expect(REGLAS_MOCK).toHaveLength(3);
    expect(ZONAS_MOCK).toHaveLength(2);
    expect(ZONAS_MOCK[0]?.costo).toBe(500);
    expect(ZONAS_MOCK[1]?.costo).toBe(800);
  });
});
