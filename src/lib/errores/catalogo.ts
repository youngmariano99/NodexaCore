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
  "NX-SYS-004": "No encontramos lo que estabas buscando.",
  "NX-SYS-005": "Estás enviando demasiadas solicitudes seguidas. Esperá un momento y volvé a intentar.",
  "NX-SYS-006": "Los datos que enviaste no son válidos. Revisá los campos marcados y volvé a intentar.",
  "NX-SYS-007": "Este recurso pertenece a otro comercio y no podés acceder a él.",
  "NX-ADM-001": "Ya existe un comercio registrado con este slug o dominio.",
  "NX-ADM-003": "No podés ampliar el catálogo por debajo del uso actual de productos.",
  "NX-PRD-001":
    "Alcanzaste el límite de productos de tu plan actual. Contamos con un pack para seguir sumando catálogo sin perder nada de lo que ya cargaste.",
  "NX-PRD-002": "Ya tenés un producto cargado con este SKU. Revisá el código o modificá el existente.",
  "NX-PRD-003": "El precio ingresado no es válido. Tiene que ser un número mayor o igual a cero.",
  "NX-PRD-004": "No podés dejar stock en negativo. Revisá la cantidad que estás por descontar.",
  "NX-PRD-005": "No pudimos guardar la imagen del producto. Probá con otro archivo o intentá de nuevo.",
  "NX-PRD-006": "Este producto ya fue dado de baja y no se puede modificar.",
  "NX-PRD-007": "El archivo Excel no tiene el formato esperado. Descargá la plantilla y volvé a intentar.",
  "NX-PRD-008": "Estás cerca del límite de tu catálogo. Te quedan pocos productos disponibles en tu plan actual.",
  "NX-VTA-001": "No hay stock suficiente de este producto para completar la venta.",
  "NX-WEB-001": "Este módulo todavía no está activo en tu cuenta. Activalo para publicar tu vidriera.",
  "NX-WEB-002": "No pudimos publicar este producto. Verificá que tenga nombre, precio e imagen cargados.",
  "NX-WEB-004": "Esta vidriera no está disponible en este momento.",
  "NX-IA-001": "Este módulo todavía no está activo en tu cuenta.",
  "NX-IA-002":
    "Ya usaste todas tus cargas por IA de este mes. Podés seguir cargando productos de forma manual mientras tanto.",
  "NX-IA-003": "No pudimos leer los datos de la foto que subiste. Probá con una imagen más clara o cargá el producto manualmente.",
  "NX-IA-004": "El archivo que subiste no es una imagen válida.",
  "NX-VTA-002": "Esta venta ya fue registrada. No hace falta confirmarla de nuevo.",
  "NX-VTA-003": "El total de la venta no puede ser negativo. Revisá los productos y cantidades cargadas.",
  "NX-VTA-004": "No encontramos esta venta en tu comercio.",
  "NX-VTA-005": "No pudimos procesar el cobro por un problema momentáneo. Probá de nuevo.",
  "NX-FIA-001": "Este módulo todavía no está activo en tu cuenta.",
  "NX-FIA-002": "No encontramos este cliente en tu comercio.",
  "NX-FIA-003": "El monto del pago no puede ser mayor a la deuda actual del cliente.",
  "NX-FIA-004": "El monto ingresado tiene que ser mayor a cero.",
  "NX-FIA-005": "Ya existe un cliente cargado con estos datos de contacto.",
  "NX-DEV-001": "Este módulo todavía no está activo en tu cuenta.",
  "NX-DEV-002": "No podés devolver más unidades de las que se vendieron originalmente.",
  "NX-DEV-003": "Esta venta ya fue devuelta por completo.",
  "NX-DEV-004": "No pudimos generar la nota de crédito. Probá de nuevo en unos minutos.",
  "NX-BOT-001": "Este módulo todavía no está activo en tu cuenta.",
  "NX-BOT-002": "Los mensajes automáticos no pueden quedar vacíos. Completá al menos uno para activar el bot.",
} as const;

export type CodigoError = keyof typeof CATALOGO_ERRORES;

export function obtenerMensajeError(codigo: string): string {
  return CATALOGO_ERRORES[codigo as CodigoError] ?? CATALOGO_ERRORES["NX-SYS-001"];
}
