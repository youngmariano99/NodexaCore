import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { obtenerMensajeError } from "@/lib/errores/catalogo";
import { crearClienteSupabaseAdmin, crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { contarProductosActivos, insertarProductosEnLote } from "@/repositories/productosRepository";
import type { RolUsuario } from "@/services/autenticacion/tipos";

const COLUMNAS_ESPERADAS = ["sku", "nombre", "precio", "categoria"] as const;
type ColumnaEsperada = (typeof COLUMNAS_ESPERADAS)[number];

const esquemaFilaImportada = z.object({
  sku: z.string({ message: "SKU inválido." }).trim().min(1, "SKU inválido."),
  nombre: z.string({ message: "Nombre inválido." }).trim().min(1, "Nombre inválido."),
  precio: z.coerce.number({ message: "Precio inválido." }).min(0, "Precio inválido."),
  categoria: z.string({ message: "Categoría inválida." }).trim().min(1, "Categoría inválida."),
});

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaCliente {
  limite_sku: number;
}

interface FilaReporteImportacion {
  fila: number;
  sku: string | null;
  insertado: boolean;
  error: string | null;
}

interface FilaCandidata {
  fila: number;
  sku: string;
  nombre: string;
  precio: number;
  categoria: string;
}

function respuestaError(codigo: string, status: number, detalle?: Record<string, unknown>) {
  return NextResponse.json({ codigo, mensaje: obtenerMensajeError(codigo), ...detalle }, { status });
}

/**
 * Extrae el valor "plano" de una celda de ExcelJS: las celdas con fórmula no
 * traen el valor directo sino `{ formula, result }`, así que hay que leer
 * `.result` para no terminar validando un objeto contra el esquema Zod.
 */
function valorPlanoDeCelda(valor: ExcelJS.CellValue): string | number | null | undefined {
  if (valor && typeof valor === "object" && "result" in valor) {
    const resultado = (valor as { result: ExcelJS.CellValue }).result;
    return resultado as string | number | null | undefined;
  }
  return valor as string | number | null | undefined;
}

/**
 * Route Handler de importación masiva de catálogo por Excel (docs/BACKLOG.md
 * "Carga masiva de productos vía Excel"). Igual que `GET /api/productos`,
 * `/api/*` no está cubierto por el matcher del proxy global (`src/proxy.ts`),
 * así que la validación de sesión + rol de acá es la autorización primaria
 * del endpoint, no defensa en profundidad. Comerciante y empleado pueden dar
 * de alta productos en su propio tenant. Además, admin_nodexa puede especificar
 * `cliente_id_override` para cargar productos en cualquier comercio cliente.
 */
export async function POST(request: NextRequest) {
  const supabase = await crearClienteSupabaseServidor();

  const {
    data: { user: usuarioAutenticado },
  } = await supabase.auth.getUser();

  if (!usuarioAutenticado) {
    return respuestaError("NX-SYS-002", 401);
  }

  const { data: solicitante, error: errorSolicitante } = await supabase
    .from("usuarios")
    .select("usuario_id, rol, cliente_id")
    .eq("auth_user_id", usuarioAutenticado.id)
    .is("eliminado_en", null)
    .single<FilaUsuarioSolicitante>();

  if (errorSolicitante || !solicitante) {
    return respuestaError("NX-SYS-001", 500);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return respuestaError("NX-PRD-007", 422, { columnasEsperadas: COLUMNAS_ESPERADAS });
  }

  const clienteIdOverrideRaw = formData.get("cliente_id_override");
  const clienteIdOverride =
    typeof clienteIdOverrideRaw === "string" && clienteIdOverrideRaw.trim().length > 0
      ? clienteIdOverrideRaw.trim()
      : null;

  let clienteId: string;
  let supabaseDb = supabase;

  if (clienteIdOverride) {
    if (solicitante.rol !== "admin_nodexa") {
      return respuestaError("NX-SYS-003", 403);
    }
    clienteId = clienteIdOverride;
    supabaseDb = crearClienteSupabaseAdmin();
  } else {
    if ((solicitante.rol !== "comerciante" && solicitante.rol !== "empleado") || !solicitante.cliente_id) {
      return respuestaError("NX-SYS-003", 403);
    }
    clienteId = solicitante.cliente_id;
  }


  const archivo = formData.get("archivo");

  if (!(archivo instanceof File)) {
    return respuestaError("NX-PRD-007", 422, { columnasEsperadas: COLUMNAS_ESPERADAS });
  }

  const libro = new ExcelJS.Workbook();
  try {
    const bytes = await archivo.arrayBuffer();
    await libro.xlsx.load(bytes);
  } catch {
    return respuestaError("NX-PRD-007", 422, { columnasEsperadas: COLUMNAS_ESPERADAS });
  }

  const hoja = libro.worksheets[0];

  if (!hoja) {
    return respuestaError("NX-PRD-007", 422, { columnasEsperadas: COLUMNAS_ESPERADAS });
  }

  const indicePorColumna = new Map<ColumnaEsperada, number>();
  hoja.getRow(1).eachCell((celda, numeroColumna) => {
    const nombreColumna = String(celda.value ?? "").trim().toLowerCase();
    if ((COLUMNAS_ESPERADAS as readonly string[]).includes(nombreColumna)) {
      indicePorColumna.set(nombreColumna as ColumnaEsperada, numeroColumna);
    }
  });

  const faltaAlgunaColumna = COLUMNAS_ESPERADAS.some((columna) => !indicePorColumna.has(columna));

  if (faltaAlgunaColumna) {
    return respuestaError("NX-PRD-007", 422, { columnasEsperadas: COLUMNAS_ESPERADAS });
  }

  const reporte: FilaReporteImportacion[] = [];
  const candidatas: FilaCandidata[] = [];
  const skusVistosEnArchivo = new Set<string>();

  for (let numeroFila = 2; numeroFila <= hoja.rowCount; numeroFila += 1) {
    const filaExcel = hoja.getRow(numeroFila);

    if (filaExcel.actualCellCount === 0) {
      continue;
    }

    const skuColumna = indicePorColumna.get("sku")!;
    const nombreColumna = indicePorColumna.get("nombre")!;
    const precioColumna = indicePorColumna.get("precio")!;
    const categoriaColumna = indicePorColumna.get("categoria")!;

    const skuCrudo = valorPlanoDeCelda(filaExcel.getCell(skuColumna).value);

    const resultado = esquemaFilaImportada.safeParse({
      sku: skuCrudo,
      nombre: valorPlanoDeCelda(filaExcel.getCell(nombreColumna).value),
      precio: valorPlanoDeCelda(filaExcel.getCell(precioColumna).value),
      categoria: valorPlanoDeCelda(filaExcel.getCell(categoriaColumna).value),
    });

    if (!resultado.success) {
      reporte.push({
        fila: numeroFila,
        sku: skuCrudo != null ? String(skuCrudo) : null,
        insertado: false,
        error: "NX-PRD-007",
      });
      continue;
    }

    if (skusVistosEnArchivo.has(resultado.data.sku)) {
      reporte.push({ fila: numeroFila, sku: resultado.data.sku, insertado: false, error: "NX-PRD-002" });
      continue;
    }

    skusVistosEnArchivo.add(resultado.data.sku);
    candidatas.push({ fila: numeroFila, ...resultado.data });
  }

  const { data: cliente, error: errorCliente } = await supabaseDb
    .from("clientes")
    .select("limite_sku")
    .eq("cliente_id", clienteId)
    .single<FilaCliente>();

  if (errorCliente || !cliente) {
    return respuestaError("NX-SYS-001", 500);
  }

  const conteoActivos = await contarProductosActivos(supabaseDb, clienteId);

  if (!conteoActivos.ok) {
    return respuestaError(conteoActivos.error, 500);
  }

  const espacioDisponible = Math.max(cliente.limite_sku - conteoActivos.data, 0);
  const dentroDelLimite = candidatas.slice(0, espacioDisponible);
  const excedentes = candidatas.slice(espacioDisponible);

  excedentes.forEach((candidata) => {
    reporte.push({ fila: candidata.fila, sku: candidata.sku, insertado: false, error: "NX-PRD-001" });
  });

  let insertados: { producto_id: string; sku: string }[] = [];

  if (dentroDelLimite.length > 0) {
    const resultadoLote = await insertarProductosEnLote(
      supabaseDb,
      clienteId,
      dentroDelLimite.map(({ sku, nombre, precio, categoria }) => ({ sku, nombre, precio, categoria })),
    );

    if (!resultadoLote.ok) {
      return respuestaError(resultadoLote.error, 500);
    }

    insertados = resultadoLote.data;
  }

  const skusInsertados = new Set(insertados.map((producto) => producto.sku));

  dentroDelLimite.forEach((candidata) => {
    if (skusInsertados.has(candidata.sku)) {
      reporte.push({ fila: candidata.fila, sku: candidata.sku, insertado: true, error: null });
    } else {
      reporte.push({ fila: candidata.fila, sku: candidata.sku, insertado: false, error: "NX-PRD-002" });
    }
  });

  insertados.forEach((producto) => {
    registrarDiff({
      clienteId,
      usuarioId: solicitante.usuario_id,
      tablaAfectada: "productos",
      registroId: producto.producto_id,
      campoModificado: "alta_masiva_excel",
      valorAnterior: null,
      valorNuevo: JSON.stringify({ sku: producto.sku }),
    });
  });

  reporte.sort((a, b) => a.fila - b.fila);

  return NextResponse.json({
    total: reporte.length,
    insertados: reporte.filter((filaReporte) => filaReporte.insertado).length,
    rechazados: reporte.filter((filaReporte) => !filaReporte.insertado).length,
    filas: reporte,
  });
}
