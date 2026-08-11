/**
 * Bloqueo y oferta de recarga al agotar la cuota de IA (docs/BACKLOG.md
 * "Validación de cuota mensual de IA antes de invocar OpenAI", Paso 1).
 * Función pura sin dependencias de Supabase/Next.js, mismo criterio ya usado
 * por `calcularNuevoSaldo`/`calcularPorcentajeUsoSku`: se reusa tanto en el
 * Route Handler (Fail-Fast server-side) como en el cliente (deshabilitar el
 * botón "Cargar foto con IA", Paso 3), sin duplicar la regla de negocio en
 * dos lugares.
 *
 * Esta comprobación es ADITIVA: `fn_registrar_consumo_ia` (RPC atómico
 * invocado por `registrarConsumoIa`) sigue siendo la única fuente de verdad
 * bajo concurrencia — el chequeo real vive en el `WHERE` de su propio
 * `UPDATE`, mismo patrón ya documentado en `calcularNuevoSaldo.ts` sobre
 * `fn_registrar_movimiento_stock`. Acá solo se corta más rápido y con mejor
 * UX en el camino feliz (sin gastar el round-trip del RPC ni, más
 * importante, el costo de Cloudinary/OpenAI si la lectura ya alcanza para
 * saber que no hay cupo).
 */
export function cuotaIaAgotada(iaConsultasUsadas: number, cuotaMensualIa: number): boolean {
  return iaConsultasUsadas >= cuotaMensualIa;
}
