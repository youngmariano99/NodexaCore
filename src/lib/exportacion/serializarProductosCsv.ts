import { serializarCsv } from "@/lib/exportacion/serializarCsv";
import type { FilaProductoListado } from "@/repositories/productosRepository";

const ENCABEZADOS_PRODUCTOS = ["sku", "nombre", "categoria", "precio", "stock_actual", "publicado"];

/**
 * Serializa el catálogo exportado a CSV (docs/SITEMAP.md "/api/export/productos").
 * Solo mapea `FilaProductoListado` a filas de `string[]`; el escapado RFC 4180
 * y el armado del texto viven en el serializador genérico compartido
 * (`serializarCsv.ts`), reutilizado también por la exportación de ventas.
 */
export function serializarProductosCsv(productos: FilaProductoListado[]): string {
  const filas = productos.map((producto) => [
    producto.sku,
    producto.nombre,
    producto.categoria ?? "",
    producto.precio.toString(),
    producto.stock_actual.toString(),
    producto.publicado ? "true" : "false",
  ]);

  return serializarCsv(ENCABEZADOS_PRODUCTOS, filas);
}
