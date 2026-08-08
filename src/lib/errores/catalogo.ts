/**
 * Subconjunto de docs/ERRORS.md realmente usado en código hasta ahora.
 * Agregar entradas acá solo cuando una estación empiece a manejar ese código
 * — está prohibido inventar códigos que no estén en el catálogo del repo.
 */
export const CATALOGO_ERRORES = {
  "NX-SYS-001":
    "No pudimos completar la acción por un error interno. Ya estamos al tanto, probá de nuevo en unos minutos.",
  "NX-SYS-006": "Los datos que enviaste no son válidos. Revisá los campos marcados y volvé a intentar.",
} as const;

export type CodigoError = keyof typeof CATALOGO_ERRORES;

export function obtenerMensajeError(codigo: string): string {
  return CATALOGO_ERRORES[codigo as CodigoError] ?? CATALOGO_ERRORES["NX-SYS-001"];
}
