export interface DebitoPendiente {
  movimientoCcId: string;
  montoPendiente: number;
  creadoEn: string;
  comprobanteTipo: string;
  numeroComprobante?: string | null;
}

export interface ImputacionResultado {
  movimientoDebitoId: string;
  montoImputado: number;
  nuevoMontoPendiente: number;
  nuevoEstadoImputacion: "pendiente" | "parcial" | "total";
}

export interface ResultadoProcesamientoImputacion {
  imputaciones: ImputacionResultado[];
  montoRemanenteSinImputar: number;
  montoTotalImputado: number;
}

/**
 * Función pura de dominio que calcula la imputación contable de un cobro contra deudas pendientes.
 * Soporta dos modos:
 * 1. Automático FIFO (Oldest First): Aplica el monto del cobro a las deudas más antiguas.
 * 2. Imputación Específica: Si se pasa `debitoEspecificoId`, prioriza saldar ese débito/producto en particular.
 */
export function procesarImputacionFifo(
  debitos: DebitoPendiente[],
  montoCobro: number,
  debitoEspecificoId?: string
): ResultadoProcesamientoImputacion {
  if (montoCobro <= 0 || debitos.length === 0) {
    return {
      imputaciones: [],
      montoRemanenteSinImputar: Math.max(0, montoCobro),
      montoTotalImputado: 0,
    };
  }

  let saldoDisponible = montoCobro;
  const imputaciones: ImputacionResultado[] = [];

  // Si hay un débito específico seleccionado por el usuario (ej: saldar producto/factura puntual)
  let listaDebitos = [...debitos];
  if (debitoEspecificoId) {
    const debitoTarget = listaDebitos.find((d) => d.movimientoCcId === debitoEspecificoId);
    if (debitoTarget) {
      listaDebitos = [debitoTarget, ...listaDebitos.filter((d) => d.movimientoCcId !== debitoEspecificoId)];
    }
  } else {
    // Ordenar FIFO por fecha de creación (los más antiguos primero)
    listaDebitos.sort((a, b) => new Date(a.creadoEn).getTime() - new Date(b.creadoEn).getTime());
  }

  for (const debito of listaDebitos) {
    if (saldoDisponible <= 0) break;
    if (debito.montoPendiente <= 0) continue;

    const montoAImputar = Math.min(saldoDisponible, debito.montoPendiente);
    const nuevoPendiente = Number((debito.montoPendiente - montoAImputar).toFixed(2));
    const nuevoEstado: "pendiente" | "parcial" | "total" =
      nuevoPendiente === 0 ? "total" : nuevoPendiente < debito.montoPendiente ? "parcial" : "pendiente";

    imputaciones.push({
      movimientoDebitoId: debito.movimientoCcId,
      montoImputado: Number(montoAImputar.toFixed(2)),
      nuevoMontoPendiente: nuevoPendiente,
      nuevoEstadoImputacion: nuevoEstado,
    });

    saldoDisponible = Number((saldoDisponible - montoAImputar).toFixed(2));
  }

  const montoTotalImputado = Number((montoCobro - saldoDisponible).toFixed(2));

  return {
    imputaciones,
    montoRemanenteSinImputar: saldoDisponible,
    montoTotalImputado,
  };
}
