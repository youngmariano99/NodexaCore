import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResultadoRepositorio } from "@/repositories/base/tipos";

export const INSUMOS_POR_PAGINA = 25;

export interface FilaInsumoListado {
  producto_id: string;
  sku: string;
  nombre: string;
  precio: number;
  stock_actual: number;
  recetas?: { rendimiento_lote: number }[] | { rendimiento_lote: number } | null;
}

export interface ResultadoInsumosPaginados {
  insumos: FilaInsumoListado[];
  total: number;
  pagina: number;
  porPagina: number;
}

export async function obtenerInsumosPaginados(
  supabase: SupabaseClient,
  clienteId: string,
  pagina: number,
  porPagina: number = INSUMOS_POR_PAGINA,
): Promise<ResultadoRepositorio<ResultadoInsumosPaginados>> {
  const paginaSegura = Number.isInteger(pagina) && pagina > 0 ? pagina : 1;
  const porPaginaSeguro = Number.isInteger(porPagina) && porPagina > 0 ? porPagina : INSUMOS_POR_PAGINA;
  const desde = (paginaSegura - 1) * porPaginaSeguro;
  const hasta = desde + porPaginaSeguro - 1;

  const { data, error, count } = await supabase
    .from("productos")
    .select("producto_id, sku, nombre, precio, stock_actual, recetas(rendimiento_lote)", { count: "exact" })
    .eq("cliente_id", clienteId)
    .eq("tipo_producto", "insumo")
    .is("eliminado_en", null)
    .order("creado_en", { ascending: false })
    .order("producto_id", { ascending: true })
    .range(desde, hasta)
    .returns<FilaInsumoListado[]>();

  if (error || !data) {
    return { error: { tipo: "error_bd", mensaje: "Error al obtener insumos paginados", original: error } };
  }

  return {
    data: {
      insumos: data,
      total: count ?? 0,
      pagina: paginaSegura,
      porPagina: porPaginaSeguro,
    },
  };
}
