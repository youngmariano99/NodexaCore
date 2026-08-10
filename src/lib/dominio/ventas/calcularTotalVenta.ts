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
