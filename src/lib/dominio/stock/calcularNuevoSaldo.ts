import { ErrorDeDominio } from "@/lib/errores/mapearError";

export type TipoMovimientoStock = "entrada" | "salida";

/**
 * Calcula el saldo resultante de aplicar un movimiento de stock sobre el
 * saldo actual de un producto (docs/SCHEMA.md §6, columna `saldo_resultante`
 * de `movimientos_stock`). Función pura, sin dependencias de Supabase ni de
 * Next.js (Paso 2 del checklist) — reutilizable tanto en Server Actions
 * (`registrarSalidaStock.ts`) como en una futura validación optimista de UI
 * (ej. Mostrador, Sprint 5).
 *
 * Lanza `ErrorDeDominio('NX-PRD-004')` en Fail-Fast antes de tocar la base
 * cuando el resultado sería negativo (Criterios de Aceptación 2 y 4). Esta
 * función es una capa de validación complementaria, NO un reemplazo de las
 * dos garantías reales de integridad que ya existen: el `CHECK (stock_actual
 * >= 0)` de docs/SCHEMA.md §5 sobre `productos`, y el `UPDATE` atómico de
 * `fn_registrar_movimiento_stock` (supabase/migrations/20260810120000_...),
 * cuya cláusula `WHERE stock_actual + v_delta >= 0` es la única fuente de
 * verdad bajo concurrencia — el `stockActual` que recibe esta función puede
 * quedar desactualizado entre la lectura del llamador y el `UPDATE` real, así
 * que nunca reemplaza esa atomicidad transaccional. Sirve para fallar rápido
 * con un mensaje de negocio claro en el camino feliz (un solo usuario, sin
 * carrera), no para garantizar la invariante bajo escritura concurrente.
 */
export function calcularNuevoSaldo(stockActual: number, cantidad: number, tipo: TipoMovimientoStock): number {
  const delta = tipo === "entrada" ? cantidad : -cantidad;
  const nuevoSaldo = stockActual + delta;

  if (nuevoSaldo < 0) {
    throw new ErrorDeDominio("NX-PRD-004");
  }

  return nuevoSaldo;
}
