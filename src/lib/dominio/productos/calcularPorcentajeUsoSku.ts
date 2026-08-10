/**
 * Umbral de aviso preventivo de límite de SKU (docs/ERRORS.md `NX-PRD-008`,
 * docs/SITEMAP.md "Flujo de Aviso y Bloqueo de Límites": "Al alcanzar el
 * 90% del límite de SKU... el sistema muestra una notificación discreta").
 */
export const UMBRAL_AVISO_SKU_PORCENTAJE = 90;

/**
 * Porcentaje de uso del catálogo de un tenant contra su `limite_sku`
 * (docs/SCHEMA.md §2). Función pura, sin dependencias de Supabase ni de
 * Next.js, para poder cubrirla con pruebas unitarias aisladas (Paso 2).
 * `limite <= 0` retorna 0 en vez de `Infinity`/`NaN`: `limite_sku` tiene
 * `CHECK (limite_sku > 0)` en la base, así que este caso no debería darse
 * en producción, pero la función no debe reventar si igual ocurre.
 */
export function calcularPorcentajeUsoSku(activos: number, limite: number): number {
  if (limite <= 0) {
    return 0;
  }

  return Math.round((activos / limite) * 100);
}

/**
 * Decide si corresponde mostrar la banda de aviso `NX-PRD-008`
 * (`bg-slate-800`/`text-slate-400`, docs/DESIGN.md §4). Se muestra desde el
 * 90% inclusive — no se le pone techo en 100%: superar el límite ya está
 * bloqueado en `crearProducto.ts` (`NX-PRD-001`), pero la banda informativa
 * sigue siendo válida mientras el tenant no haya reducido su uso.
 */
export function debeMostrarAvisoLimiteSku(porcentajeUso: number): boolean {
  return porcentajeUso >= UMBRAL_AVISO_SKU_PORCENTAJE;
}
