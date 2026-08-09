import type { SupabaseClient } from "@supabase/supabase-js";

import { verificarPertenenciaTenant } from "@/repositories/base/verificarPertenenciaTenant";
import type { ResultadoRepositorio } from "@/repositories/base/tipos";

export type EstadoVenta = "confirmada" | "devuelta_parcial" | "devuelta_total";

export interface ContextoRepositorioVentas {
  supabase: SupabaseClient;
  clienteIdJwt: string | null;
  usuarioId: string;
}

interface FilaVentaActualizada {
  venta_id: string;
  estado: EstadoVenta;
}

/**
 * Transición de estado de una venta (ej. a `devuelta_parcial`/`devuelta_total`
 * al confirmarse una devolución — docs/SCHEMA.md §7). Guard IDOR/BOLA
 * (docs/ROLES.md §3.8) antes de tocar la base: si la venta no pertenece al
 * tenant del solicitante, corta en NX-SYS-007 sin ejecutar el UPDATE.
 */
export async function actualizarEstadoVenta(
  ventaId: string,
  nuevoEstado: EstadoVenta,
  contexto: ContextoRepositorioVentas,
): Promise<ResultadoRepositorio<FilaVentaActualizada>> {
  const { supabase, clienteIdJwt, usuarioId } = contexto;

  const verificacion = await verificarPertenenciaTenant(ventaId, clienteIdJwt, {
    supabase,
    tabla: "ventas",
    usuarioId,
  });

  if (!verificacion.perteneceAlTenant) {
    return { ok: false, error: verificacion.error ?? "NX-SYS-007" };
  }

  const { data, error } = await supabase
    .from("ventas")
    .update({ estado: nuevoEstado })
    .eq("venta_id", ventaId)
    .select("venta_id, estado")
    .single<FilaVentaActualizada>();

  if (error || !data) {
    return { ok: false, error: "NX-SYS-001" };
  }

  return { ok: true, data };
}
