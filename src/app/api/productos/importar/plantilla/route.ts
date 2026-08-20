import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

export async function GET() {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Productos");

  hoja.columns = [
    { header: "sku", key: "sku", width: 15 },
    { header: "nombre", key: "nombre", width: 30 },
    { header: "precio", key: "precio", width: 12 },
    { header: "categoria", key: "categoria", width: 20 },
  ];

  // Agregar filas de ejemplo
  hoja.addRow({ sku: "YER-1KG", nombre: "Yerba mate 1kg", precio: 3500, categoria: "Almacén" });
  hoja.addRow({ sku: "LEC-ENT", nombre: "Leche entera 1L", precio: 1200, categoria: "Lácteos" });

  const buffer = await libro.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla_nodexa.xlsx"',
    },
  });
}
