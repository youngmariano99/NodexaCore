import path from "node:path";

import ExcelJS from "exceljs";

/**
 * Genera el archivo Excel de prueba de la actividad "Route Handler de
 * importación de catálogo por Excel" (500 filas, algunas con SKU duplicado y
 * precio negativo — pedido explícito del ticket para validar el reporte de
 * filas exitosas/rechazadas de `app/api/productos/importar/route.ts`).
 *
 * No es un seed de base de datos (no toca Supabase): es un fixture de
 * archivo para probar el Route Handler manualmente o desde un E2E, por eso
 * vive en `scripts/fixtures/` y no en `supabase/migrations/`.
 *
 * Distribución de las 500 filas:
 * - 481 filas válidas con SKU único (insertables, sujetas al limite_sku del tenant).
 * - 9 SKU que se repiten una vez cada uno (18 filas totales) dentro del mismo
 *   archivo, para ejercitar el rechazo NX-PRD-002 de la segunda aparición.
 * - 10 filas con precio negativo (NX-PRD-007, formato inválido).
 *
 * Ejecutar con: npx tsx scripts/generar-fixture-importacion-productos.ts
 */
async function generarFixture(): Promise<void> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("productos");
  hoja.addRow(["sku", "nombre", "precio", "categoria"]);

  const categorias = ["Almacén", "Bebidas", "Limpieza", "Kiosco"];
  const totalFilas = 500;
  const filasDuplicadas = new Set<number>([50, 120, 180, 245, 300, 333, 360, 401, 420, 450, 55, 125, 185, 250, 305, 338, 365, 406, 425, 455]);
  const filasPrecioNegativo = new Set<number>([10, 75, 150, 220, 275, 330, 390, 410, 440, 480]);

  for (let n = 1; n <= totalFilas; n += 1) {
    const esDuplicada = filasDuplicadas.has(n);
    // Las filas marcadas como "segunda mitad" del duplicado reutilizan el SKU de n-5.
    const sku = esDuplicada && n > 60 ? `FIX-${String(n - 5).padStart(5, "0")}` : `FIX-${String(n).padStart(5, "0")}`;
    const precio = filasPrecioNegativo.has(n) ? -Math.abs(100 + n) : Math.round((500 + Math.random() * 9500) * 100) / 100;

    hoja.addRow([sku, `Producto de Prueba ${n}`, precio, categorias[n % categorias.length]]);
  }

  const rutaDestino = path.resolve(__dirname, "fixtures", "importacion-productos-prueba.xlsx");
  await libro.xlsx.writeFile(rutaDestino);

  console.log(`Fixture generado en ${rutaDestino} (${totalFilas} filas, ${filasDuplicadas.size} SKU duplicados, ${filasPrecioNegativo.size} precios negativos).`);
}

generarFixture().catch((error) => {
  console.error("Error generando el fixture de importación:", error);
  process.exitCode = 1;
});
