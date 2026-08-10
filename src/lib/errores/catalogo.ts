/**
 * Subconjunto de docs/ERRORS.md realmente usado en código hasta ahora.
 * Agregar entradas acá solo cuando una estación empiece a manejar ese código
 * — está prohibido inventar códigos que no estén en el catálogo del repo.
 */
export const CATALOGO_ERRORES = {
  "NX-SYS-001":
    "No pudimos completar la acción por un error interno. Ya estamos al tanto, probá de nuevo en unos minutos.",
  "NX-SYS-002": "Tu sesión venció por seguridad. Iniciá sesión de nuevo para seguir donde estabas.",
  "NX-SYS-003": "No tenés permiso para acceder a esta sección.",
  "NX-SYS-005": "Estás enviando demasiadas solicitudes seguidas. Esperá un momento y volvé a intentar.",
  "NX-SYS-006": "Los datos que enviaste no son válidos. Revisá los campos marcados y volvé a intentar.",
  "NX-SYS-007": "Este recurso pertenece a otro comercio y no podés acceder a él.",
  "NX-ADM-001": "Ya existe un comercio registrado con este slug o dominio.",
} as const;

export type CodigoError = keyof typeof CATALOGO_ERRORES;

export function obtenerMensajeError(codigo: string): string {
  return CATALOGO_ERRORES[codigo as CodigoError] ?? CATALOGO_ERRORES["NX-SYS-001"];
}
