import { describe, expect, it } from "vitest";

import { procesarImputacionFifo, type DebitoPendiente } from "./procesarImputacionFifo";

const DEBITOS_MOCK: DebitoPendiente[] = [
  {
    movimientoCcId: "deb-1",
    montoPendiente: 20000,
    creadoEn: "2026-08-01T10:00:00Z",
    comprobanteTipo: "factura",
    numeroComprobante: "V-001",
  },
  {
    movimientoCcId: "deb-2",
    montoPendiente: 30000,
    creadoEn: "2026-08-05T10:00:00Z",
    comprobanteTipo: "factura",
    numeroComprobante: "V-002",
  },
];

describe("Lógica de Imputación FIFO y Específica (procesarImputacionFifo)", () => {
  it("imputa correctamente en modo FIFO (cancela primero deb-1 y parcialmente deb-2)", () => {
    const resultado = procesarImputacionFifo(DEBITOS_MOCK, 35000);

    expect(resultado.montoTotalImputado).toBe(35000);
    expect(resultado.montoRemanenteSinImputar).toBe(0);
    expect(resultado.imputaciones).toHaveLength(2);

    expect(resultado.imputaciones[0]).toEqual({
      movimientoDebitoId: "deb-1",
      montoImputado: 20000,
      nuevoMontoPendiente: 0,
      nuevoEstadoImputacion: "total",
    });

    expect(resultado.imputaciones[1]).toEqual({
      movimientoDebitoId: "deb-2",
      montoImputado: 15000,
      nuevoMontoPendiente: 15000,
      nuevoEstadoImputacion: "parcial",
    });
  });

  it("permite imputación específica seleccionando deb-2 directamente", () => {
    const resultado = procesarImputacionFifo(DEBITOS_MOCK, 20000, "deb-2");

    expect(resultado.montoTotalImputado).toBe(20000);
    expect(resultado.imputaciones).toHaveLength(1);

    expect(resultado.imputaciones[0]).toEqual({
      movimientoDebitoId: "deb-2",
      montoImputado: 20000,
      nuevoMontoPendiente: 10000,
      nuevoEstadoImputacion: "parcial",
    });
  });

  it("retorna remanente sin imputar si el pago supera la deuda total", () => {
    const resultado = procesarImputacionFifo(DEBITOS_MOCK, 60000);

    expect(resultado.montoTotalImputado).toBe(50000);
    expect(resultado.montoRemanenteSinImputar).toBe(10000);
    expect(resultado.imputaciones).toHaveLength(2);
    expect(resultado.imputaciones[0].nuevoEstadoImputacion).toBe("total");
    expect(resultado.imputaciones[1].nuevoEstadoImputacion).toBe("total");
  });
});
