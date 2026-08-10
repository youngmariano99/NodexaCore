import type { SupabaseClient } from "@supabase/supabase-js";

import type { ResultadoRepositorio } from "@/repositories/base/tipos";

export const MOVIMIENTOS_STOCK_POR_PAGINA = 25;

export type TipoMovimientoStock = "entrada" | "salida";

export interface FilaMovimientoStockListado {
  movimiento_id: string;
  producto_id: string;
  producto_nombre: string;
  producto_sku: string;
  tipo: TipoMovimientoStock;
  cantidad: number;
  saldo_resultante: number;
  creado_en: string;
}

export interface ResultadoMovimientosStockPaginados {
  movimientos: FilaMovimientoStockListado[];
  total: number;
  pagina: number;
  porPagina: number;
}

interface FilaMovimientoStockCruda {
  movimiento_id: string;
  producto_id: string;
  tipo: TipoMovimientoStock;
  cantidad: number;
  saldo_resultante: number;
  creado_en: string;
  productos: { nombre: string; sku: string } | null;
}

/**
 * Listado paginado de movimientos de stock de un tenant (docs/BACKLOG.md
 * "Vista de movimientos de stock con TanStack Query", Paso 1: "consultando
 * `movimientos_stock` paginado por `producto_id`"). Cuando se pasa
 * `productoId`, el filtro `.eq('producto_id', ...)` + `.order('creado_en')`
 * calza exactamente con `idx_movstock_producto (producto_id, creado_en DESC)`
 * de docs/SCHEMA.md §6; sin filtro, el listado queda scopeado solo por
 * `cliente_id` (`idx_movstock_cliente`), para la vista general de `/stock`.
 *
 * `.order()` incluye `movimiento_id` como desempate por el mismo motivo que
 * `obtenerProductosPaginados` (docs/BACKLOG.md, estación de listado de
 * productos): los movimientos sembrados en un mismo lote comparten
 * literalmente el mismo `creado_en` (Postgres evalúa `DEFAULT now()` una
 * sola vez por sentencia en un INSERT masivo), y sin desempate `.range()` no
 * garantiza el mismo orden entre dos páginas.
 *
 * Trae el nombre/SKU del producto embebiendo la FK (`productos(nombre, sku)`)
 * en una sola query, nunca N+1 por fila — nunca un `SELECT *` sin `LIMIT`
 * (CLAUDE.md §4 "escalabilidad").
 */
export async function obtenerMovimientosStockPaginados(
  supabase: SupabaseClient,
  clienteId: string,
  pagina: number,
  porPagina: number = MOVIMIENTOS_STOCK_POR_PAGINA,
  productoId?: string,
): Promise<ResultadoRepositorio<ResultadoMovimientosStockPaginados>> {
  const paginaSegura = Number.isInteger(pagina) && pagina > 0 ? pagina : 1;
  const porPaginaSeguro = Number.isInteger(porPagina) && porPagina > 0 ? porPagina : MOVIMIENTOS_STOCK_POR_PAGINA;
  const desde = (paginaSegura - 1) * porPaginaSeguro;
  const hasta = desde + porPaginaSeguro - 1;

  let consulta = supabase
    .from("movimientos_stock")
    .select("movimiento_id, producto_id, tipo, cantidad, saldo_resultante, creado_en, productos(nombre, sku)", {
      count: "exact",
    })
    .eq("cliente_id", clienteId);

  if (productoId) {
    consulta = consulta.eq("producto_id", productoId);
  }

  const { data, error, count } = await consulta
    .order("creado_en", { ascending: false })
    .order("movimiento_id", { ascending: true })
    .range(desde, hasta)
    .returns<FilaMovimientoStockCruda[]>();

  if (error || !data) {
    return { ok: false, error: "NX-SYS-001" };
  }

  return {
    ok: true,
    data: {
      movimientos: data.map((fila) => ({
        movimiento_id: fila.movimiento_id,
        producto_id: fila.producto_id,
        producto_nombre: fila.productos?.nombre ?? "—",
        producto_sku: fila.productos?.sku ?? "—",
        tipo: fila.tipo,
        cantidad: fila.cantidad,
        saldo_resultante: fila.saldo_resultante,
        creado_en: fila.creado_en,
      })),
      total: count ?? 0,
      pagina: paginaSegura,
      porPagina: porPaginaSeguro,
    },
  };
}
