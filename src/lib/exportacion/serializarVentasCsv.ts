import { serializarCsv } from "@/lib/exportacion/serializarCsv";
import type { FilaVentaExport, FilaVentaItemExport } from "@/repositories/ventas";

const ENCABEZADOS_VENTAS = ["venta_id", "cliente_final_id", "total", "estado", "creado_en"];
const ENCABEZADOS_VENTA_ITEMS = ["venta_item_id", "venta_id", "producto_id", "cantidad", "precio_unitario", "subtotal"];

/**
 * Serializa `ventas` + `venta_items` exportados a CSV (docs/SITEMAP.md
 * "/api/export/ventas"). Un archivo CSV es tabular por naturaleza (una sola
 * grilla de columnas), pero acá se exportan dos entidades relacionadas con
 * columnas distintas — se resuelve con dos secciones dentro del mismo
 * texto, cada una con su propio encabezado, precedidas por una línea
 * `# nombre_tabla` (convención de comentario reconocida por la mayoría de
 * los lectores de CSV/hojas de cálculo, que la ignoran al parsear filas de
 * datos). El escapado y el armado de cada sección reutilizan el
 * serializador genérico (`serializarCsv.ts`) ya usado por
 * `serializarProductosCsv.ts` (Paso 2 del checklist).
 */
export function serializarVentasCsv(ventas: FilaVentaExport[], ventaItems: FilaVentaItemExport[]): string {
  const csvVentas = serializarCsv(
    ENCABEZADOS_VENTAS,
    ventas.map((venta) => [
      venta.venta_id,
      venta.cliente_final_id ?? "",
      venta.total.toString(),
      venta.estado,
      venta.creado_en,
    ]),
  );

  const csvVentaItems = serializarCsv(
    ENCABEZADOS_VENTA_ITEMS,
    ventaItems.map((item) => [
      item.venta_item_id,
      item.venta_id,
      item.producto_id,
      item.cantidad.toString(),
      item.precio_unitario.toString(),
      item.subtotal.toString(),
    ]),
  );

  return ["# ventas", csvVentas, "", "# venta_items", csvVentaItems].join("\r\n");
}
