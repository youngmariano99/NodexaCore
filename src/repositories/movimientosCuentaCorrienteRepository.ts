import type { SupabaseClient } from "@supabase/supabase-js";

import type { ResultadoRepositorio } from "@/repositories/base/tipos";

export const MOVIMIENTOS_CUENTA_CORRIENTE_POR_PAGINA = 25;

export type TipoMovimientoCuenta = "cargo" | "pago";

export interface FilaMovimientoCuentaCorrienteListado {
  movimiento_cc_id: string;
  tipo: TipoMovimientoCuenta;
  monto: number;
  venta_id: string | null;
  creado_en: string;
}

export interface ResultadoMovimientosCuentaCorrientePaginados {
  movimientos: FilaMovimientoCuentaCorrienteListado[];
  total: number;
  pagina: number;
  porPagina: number;
}

/**
 * Listado paginado del historial de cuenta corriente de un cliente final
 * (docs/BACKLOG.md "Vista de historial de cuenta corriente por cliente",
 * Paso 1). El filtro `.eq('cliente_final_id', ...)` + `.order('creado_en')`
 * calza exactamente con `idx_movcc_clientefinal (cliente_final_id,
 * creado_en DESC)` de docs/SCHEMA.md §10 — orden cronológico, más reciente
 * primero, mismo criterio ya usado por `obtenerMovimientosStockPaginados`
 * para el resumen tipo "extracto".
 *
 * `.order()` agrega `movimiento_cc_id` como desempate: los movimientos
 * sembrados en un mismo lote comparten literalmente el mismo `creado_en`
 * (Postgres evalúa `DEFAULT now()` una sola vez por sentencia en un INSERT
 * masivo), mismo hallazgo ya documentado en `obtenerProductosPaginados` y
 * `obtenerMovimientosStockPaginados` — sin desempate, `.range()` no
 * garantiza el mismo orden entre dos páginas.
 *
 * No filtra por `cliente_id` acá: el guard de pertenencia de tenant del
 * `cliente_final_id` ya corrió antes de llamar a esta función
 * (`verificarPertenenciaTenant`, docs/ROLES.md §3.8), y la política RLS
 * `movimientos_cuenta_corriente_select_tenant` (vía subconsulta a
 * `clientes_finales`) sigue siendo la autoridad real de todas formas.
 */
export async function obtenerMovimientosCuentaCorrientePaginados(
  supabase: SupabaseClient,
  clienteFinalId: string,
  pagina: number,
  porPagina: number = MOVIMIENTOS_CUENTA_CORRIENTE_POR_PAGINA,
): Promise<ResultadoRepositorio<ResultadoMovimientosCuentaCorrientePaginados>> {
  const paginaSegura = Number.isInteger(pagina) && pagina > 0 ? pagina : 1;
  const porPaginaSeguro = Number.isInteger(porPagina) && porPagina > 0 ? porPagina : MOVIMIENTOS_CUENTA_CORRIENTE_POR_PAGINA;
  const desde = (paginaSegura - 1) * porPaginaSeguro;
  const hasta = desde + porPaginaSeguro - 1;

  const { data, error, count } = await supabase
    .from("movimientos_cuenta_corriente")
    .select("movimiento_cc_id, tipo, monto, venta_id, creado_en", { count: "exact" })
    .eq("cliente_final_id", clienteFinalId)
    .order("creado_en", { ascending: false })
    .order("movimiento_cc_id", { ascending: true })
    .range(desde, hasta)
    .returns<FilaMovimientoCuentaCorrienteListado[]>();

  if (error || !data) {
    return { ok: false, error: "NX-SYS-001" };
  }

  return {
    ok: true,
    data: {
      movimientos: data,
      total: count ?? 0,
      pagina: paginaSegura,
      porPagina: porPaginaSeguro,
    },
  };
}
