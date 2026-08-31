const CENTAVOS_POR_UNIDAD = 100;

export interface VentaItem {
  productoId: string;
  precioUnitario: number;
  cantidad: number;
}

/**
 * Redondea un monto a centavos (dos decimales, `numeric(12,2)` de
 * docs/SCHEMA.md §7-8: `ventas.total` y `venta_items.subtotal`/`precio_unitario`)
 * trabajando en enteros. Sumar montos en punto flotante directamente arrastra
 * el error de redondeo binario clásico de JS (`0.1 + 0.2 !== 0.3`); pasar a
 * centavos enteros antes de sumar y dividir recién al final elimina esa
 * deriva por completo — la suma de enteros es siempre exacta.
 */
function aCentavos(monto: number): number {
  return Math.round(monto * CENTAVOS_POR_UNIDAD);
}

function centavosASubtotal(centavos: number): number {
  return centavos / CENTAVOS_POR_UNIDAD;
}

function subtotalItemEnCentavos(item: VentaItem): number {
  return aCentavos(item.precioUnitario) * item.cantidad;
}

/**
 * Subtotal de una línea de venta (`precio_unitario * cantidad`, redondeado a
 * `numeric(12,2)`) — corresponde 1:1 a `venta_items.subtotal` de
 * docs/SCHEMA.md §8. Función pura, sin efectos secundarios.
 */
export function calcularSubtotalItem(item: VentaItem): number {
  return centavosASubtotal(subtotalItemEnCentavos(item));
}

export type TipoAjustePago = "descuento" | "recargo" | "ninguno";

export interface ReglaMetodoPago {
  metodoPago: string; // ej: "efectivo", "transferencia", "debito", "credito", "cuenta_corriente"
  etiqueta: string; // ej: "Efectivo", "Transferencia", "Débito", "Crédito", "Cta. Cte."
  tipoAjuste: TipoAjustePago;
  porcentaje: number; // ej: 10 para 10%
  activo: boolean;
}

export const METODOS_PAGO_POR_DEFECTO: ReglaMetodoPago[] = [
  {
    metodoPago: "efectivo",
    etiqueta: "Efectivo",
    tipoAjuste: "ninguno",
    porcentaje: 0,
    activo: true,
  },
  {
    metodoPago: "transferencia",
    etiqueta: "Transferencia",
    tipoAjuste: "ninguno",
    porcentaje: 0,
    activo: true,
  },
  {
    metodoPago: "debito",
    etiqueta: "Débito",
    tipoAjuste: "ninguno",
    porcentaje: 0,
    activo: true,
  },
  {
    metodoPago: "credito",
    etiqueta: "Crédito",
    tipoAjuste: "recargo",
    porcentaje: 10,
    activo: true,
  },
  {
    metodoPago: "cuenta_corriente",
    etiqueta: "Cta. Cte.",
    tipoAjuste: "ninguno",
    porcentaje: 0,
    activo: true,
  },
];

/**
 * Calcula el monto del ajuste (positivo para recargo, negativo para descuento)
 * y el total final a partir del subtotal bruto. Trabaja íntegramente en centavos
 * para garantizar precisión decimal estricta (numeric(12,2)).
 */
export function calcularAjusteComercial(
  subtotalBruto: number,
  tipoAjuste: TipoAjustePago,
  porcentaje: number
): { montoAjuste: number; totalFinal: number } {
  if (tipoAjuste === "ninguno" || porcentaje <= 0 || subtotalBruto <= 0) {
    return {
      montoAjuste: 0,
      totalFinal: subtotalBruto,
    };
  }

  const subtotalCentavos = aCentavos(subtotalBruto);
  const porcentajeSeguro = Math.max(0, Math.min(porcentaje, 100));
  const montoAjusteCentavos = Math.round((subtotalCentavos * porcentajeSeguro) / 100);

  if (tipoAjuste === "descuento") {
    const descuentoCentavos = Math.min(montoAjusteCentavos, subtotalCentavos);
    const totalCentavos = subtotalCentavos - descuentoCentavos;
    return {
      montoAjuste: -centavosASubtotal(descuentoCentavos),
      totalFinal: centavosASubtotal(totalCentavos),
    };
  }

  // Recargo
  const totalCentavos = subtotalCentavos + montoAjusteCentavos;
  return {
    montoAjuste: centavosASubtotal(montoAjusteCentavos),
    totalFinal: centavosASubtotal(totalCentavos),
  };
}

/**
 * Calcula el subtotal bruto, el monto del ajuste y el total final de una venta
 * con precisión bancaria.
 */
export function calcularTotalVentaConAjuste(
  items: VentaItem[],
  tipoAjuste: TipoAjustePago = "ninguno",
  porcentaje = 0
): { subtotalBruto: number; montoAjuste: number; totalFinal: number } {
  const subtotalBruto = calcularTotalVenta(items);
  const { montoAjuste, totalFinal } = calcularAjusteComercial(subtotalBruto, tipoAjuste, porcentaje);

  return {
    subtotalBruto,
    montoAjuste,
    totalFinal,
  };
}

/**
 * Total de una venta a partir de sus ítems (docs/BACKLOG.md "Cálculo
 * automático del total de la venta", Paso 1). Función pura sin dependencias
 * de Supabase, Next.js ni de ningún estado externo — invocarla dos veces con
 * el mismo arreglo siempre da el mismo resultado, y no muta `items` (Criterio
 * de Aceptación 4). Un arreglo vacío retorna `0` sin lanzar excepción
 * (Criterio de Aceptación 2, `[].reduce` con valor inicial nunca lanza).
 *
 * Cada línea se convierte a centavos enteros (`subtotalItemEnCentavos`)
 * antes de acumularse; la suma de enteros no puede arrastrar el error de
 * redondeo binario que sí tendría `total += precio * cantidad` en punto
 * flotante directo, así que el resultado siempre coincide con la suma exacta
 * de los subtotales redondeados a `numeric(12,2)` (Criterio de Aceptación 1),
 * sin discrepancias de centavos sin importar cuántos ítems o qué precios se
 * combinen (Criterio de Aceptación 3).
 */
export function calcularTotalVenta(items: VentaItem[]): number {
  const totalCentavos = items.reduce((acumulado, item) => acumulado + subtotalItemEnCentavos(item), 0);
  return centavosASubtotal(totalCentavos);
}
