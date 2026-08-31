import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  transformarNumeroLocal,
  transformarTelefono,
  zMonedaNoNegativa,
  zMonedaPositiva,
  zTelefonoObligatorio,
  zTelefonoOpcional,
} from "./transformadores";

describe("transformarNumeroLocal", () => {
  it("convierte números enteros y decimales nativos sin cambios", () => {
    expect(transformarNumeroLocal(1500)).toBe(1500);
    expect(transformarNumeroLocal(0)).toBe(0);
    expect(transformarNumeroLocal(45.5)).toBe(45.5);
  });

  it("convierte strings con formato moneda argentino (punto miles, coma decimal)", () => {
    expect(transformarNumeroLocal("30.000,50")).toBe(30000.5);
    expect(transformarNumeroLocal("$ 30.000,50")).toBe(30000.5);
    expect(transformarNumeroLocal("1.250.000,00")).toBe(1250000);
    expect(transformarNumeroLocal("30.000")).toBe(30000);
    expect(transformarNumeroLocal("1.500")).toBe(1500);
  });

  it("convierte strings con solo coma como separador decimal", () => {
    expect(transformarNumeroLocal("3500,75")).toBe(3500.75);
    expect(transformarNumeroLocal("0,50")).toBe(0.5);
  });

  it("convierte strings estándar con punto decimal", () => {
    expect(transformarNumeroLocal("30000.50")).toBe(30000.5);
    expect(transformarNumeroLocal("15.2")).toBe(15.2);
  });

  it("retorna NaN para valores vacíos o no numéricos", () => {
    expect(transformarNumeroLocal("")).toBeNaN();
    expect(transformarNumeroLocal("   ")).toBeNaN();
    expect(transformarNumeroLocal("abc")).toBeNaN();
    expect(transformarNumeroLocal(null)).toBeNaN();
  });
});

describe("transformarTelefono", () => {
  it("elimina espacios, guiones, paréntesis y puntos", () => {
    expect(transformarTelefono("+54 9 2920 11-2233")).toBe("+5492920112233");
    expect(transformarTelefono("(011) 4567-8901")).toBe("01145678901");
    expect(transformarTelefono("  +5492920445566  ")).toBe("+5492920445566");
    expect(transformarTelefono("11.2233.4455")).toBe("1122334455");
  });

  it("retorna null para cadenas vacías o no válidas", () => {
    expect(transformarTelefono("")).toBeNull();
    expect(transformarTelefono("   ")).toBeNull();
    expect(transformarTelefono(null)).toBeNull();
  });
});

describe("Zod Schemas", () => {
  it("zMonedaNoNegativa valida montos mayores o iguales a 0", () => {
    const esquema = z.object({ precio: zMonedaNoNegativa() });

    expect(esquema.safeParse({ precio: "30.000,50" }).success).toBe(true);
    expect(esquema.safeParse({ precio: "0" }).success).toBe(true);
    expect(esquema.safeParse({ precio: "-50" }).success).toBe(false);
  });

  it("zMonedaPositiva valida montos estrictamente mayores a 0", () => {
    const esquema = z.object({ monto: zMonedaPositiva() });

    expect(esquema.safeParse({ monto: "1.500" }).success).toBe(true);
    expect(esquema.safeParse({ monto: "0" }).success).toBe(false);
    expect(esquema.safeParse({ monto: "-100" }).success).toBe(false);
  });

  it("zTelefonoOpcional sanitiza y valida formato o permite null", () => {
    const esquema = z.object({ telefono: zTelefonoOpcional() });

    const res1 = esquema.safeParse({ telefono: "+54 9 2920 00-1111" });
    expect(res1.success).toBe(true);
    if (res1.success) expect(res1.data.telefono).toBe("+5492920001111");

    const res2 = esquema.safeParse({ telefono: "" });
    expect(res2.success).toBe(true);
    if (res2.success) expect(res2.data.telefono).toBeNull();
  });
});
