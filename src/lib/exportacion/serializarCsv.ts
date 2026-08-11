/**
 * Escapa un campo según RFC 4180: si contiene coma, comilla doble o salto de
 * línea, se envuelve entre comillas dobles y cada comilla interna se
 * duplica. Sin esto, un valor con una coma real (ej. "Tornillo, 1/2
 * pulgada") rompería el conteo de columnas del CSV generado.
 */
function escaparCampoCsv(valor: string): string {
  if (/[",\r\n]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

/**
 * Serializador CSV genérico (docs/SITEMAP.md "/api/export → Exportación
 * CSV/JSON"), reutilizado por `serializarProductosCsv.ts` y por la
 * exportación de ventas/venta_items (Paso 2 de "Route Handler de
 * exportación de ventas y movimientos": "reutilizar el serializador
 * genérico de la exportación de productos"). No conoce ninguna entidad de
 * dominio — recibe encabezados y filas ya convertidas a `string`, y solo se
 * ocupa del escapado RFC 4180 y del armado del texto (CRLF entre filas).
 * Mapear cada entidad a `string[]` queda en un serializador específico por
 * dominio, que sí conoce sus propias columnas.
 */
export function serializarCsv(encabezados: string[], filas: string[][]): string {
  const lineaEncabezados = encabezados.map(escaparCampoCsv).join(",");
  const lineasDatos = filas.map((fila) => fila.map(escaparCampoCsv).join(","));

  return [lineaEncabezados, ...lineasDatos].join("\r\n");
}
