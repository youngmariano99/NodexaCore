import type { FilaProductoListado } from "@/repositories/productosRepository";

const ENCABEZADOS_CSV = ["sku", "nombre", "categoria", "precio", "stock_actual", "publicado"];

/**
 * Escapa un campo según RFC 4180: si contiene coma, comilla doble o salto de
 * línea, se envuelve entre comillas dobles y cada comilla interna se
 * duplica. Sin esto, un `nombre` de producto con una coma real (ej.
 * "Tornillo, 1/2 pulgada") rompería el conteo de columnas del CSV
 * generado.
 */
function escaparCampoCsv(valor: string): string {
  if (/[",\r\n]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

/**
 * Serializa el catálogo exportado a CSV (docs/SITEMAP.md "/api/export →
 * Exportación CSV/JSON de catálogo"). Función pura, sin dependencias de
 * Supabase ni de Next.js, para poder probarla de forma aislada. Usa CRLF
 * como separador de línea (RFC 4180) y BOM UTF-8 lo agrega el llamador en
 * la respuesta HTTP, no acá — esta función solo arma el texto.
 */
export function serializarProductosCsv(productos: FilaProductoListado[]): string {
  const filas = productos.map((producto) =>
    [
      producto.sku,
      producto.nombre,
      producto.categoria ?? "",
      producto.precio.toString(),
      producto.stock_actual.toString(),
      producto.publicado ? "true" : "false",
    ]
      .map(escaparCampoCsv)
      .join(","),
  );

  return [ENCABEZADOS_CSV.join(","), ...filas].join("\r\n");
}
