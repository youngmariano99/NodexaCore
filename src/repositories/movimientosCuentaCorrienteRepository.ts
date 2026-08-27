import type { SupabaseClient } from "@supabase/supabase-js";

import type { ResultadoRepositorio } from "@/repositories/base/tipos";

export const MOVIMIENTOS_CUENTA_CORRIENTE_POR_PAGINA = 25;

export type TipoMovimientoCuenta = "cargo" | "pago" | "anulacion";

export interface FilaMovimientoCuentaCorrienteListado {
  movimiento_cc_id: string;
  tipo: TipoMovimientoCuenta;
  monto: number;
  monto_pendiente?: number;
  estado_imputacion?: "pendiente" | "parcial" | "total";
  comprobante_tipo?: string;
  numero_comprobante?: string | null;
  saldo_historico_resultante?: number;
  metodo_pago?: string | null;
  venta_id: string | null;
  creado_en: string;
}

export interface ResultadoMovimientosCuentaCorrientePaginados {
  movimientos: FilaMovimientoCuentaCorrienteListado[];
  total: number;
  pagina: number;
  porPagina: number;
}

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
    .select("movimiento_cc_id, tipo, monto, monto_pendiente, estado_imputacion, comprobante_tipo, numero_comprobante, saldo_historico_resultante, metodo_pago, venta_id, creado_en", { count: "exact" })
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

export interface FilaDebitoPendiente {
  movimiento_cc_id: string;
  monto: number;
  monto_pendiente: number;
  comprobante_tipo: string;
  numero_comprobante: string | null;
  creado_en: string;
}

/**
 * Obtiene los débitos/facturas pendientes de cancelar de un cliente ordenados FIFO (más antiguos primero)
 */
export async function obtenerDebitosPendientes(
  supabase: SupabaseClient,
  clienteFinalId: string
): Promise<ResultadoRepositorio<FilaDebitoPendiente[]>> {
  const { data, error } = await supabase
    .from("movimientos_cuenta_corriente")
    .select("movimiento_cc_id, monto, monto_pendiente, comprobante_tipo, numero_comprobante, creado_en")
    .eq("cliente_final_id", clienteFinalId)
    .eq("tipo", "cargo")
    .gt("monto_pendiente", 0)
    .order("creado_en", { ascending: true });

  if (error) {
    return { ok: false, error: "NX-SYS-001" };
  }

  return { ok: true, data: data ?? [] };
}

