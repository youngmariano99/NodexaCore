import type { SupabaseClient } from "@supabase/supabase-js";

import { verificarPertenenciaTenant } from "@/repositories/base/verificarPertenenciaTenant";
import type { ResultadoRepositorio } from "@/repositories/base/tipos";

export type EstadoDevolucion = "registrada" | "procesada";

export interface ContextoRepositorioDevoluciones {
  supabase: SupabaseClient;
  clienteIdJwt: string | null;
  usuarioId: string;
}

interface FilaDevolucionActualizada {
  devolucion_id: string;
  estado: EstadoDevolucion;
}

/**
 * Transición de estado de una devolución (docs/SCHEMA.md §11: `registrada`
 * -> `procesada` al generarse la nota de crédito asociada). Guard IDOR/BOLA
 * (docs/ROLES.md §3.8) antes de tocar la base: si la devolución no pertenece
 * al tenant del solicitante, corta en NX-SYS-007 sin ejecutar el UPDATE.
 */
export async function actualizarEstadoDevolucion(
  devolucionId: string,
  nuevoEstado: EstadoDevolucion,
  contexto: ContextoRepositorioDevoluciones,
): Promise<ResultadoRepositorio<FilaDevolucionActualizada>> {
  const { supabase, clienteIdJwt, usuarioId } = contexto;

  const verificacion = await verificarPertenenciaTenant(devolucionId, clienteIdJwt, {
    supabase,
    tabla: "devoluciones",
    usuarioId,
  });

  if (!verificacion.perteneceAlTenant) {
    return { ok: false, error: verificacion.error ?? "NX-SYS-007" };
  }

  const { data, error } = await supabase
    .from("devoluciones")
    .update({ estado: nuevoEstado })
    .eq("devolucion_id", devolucionId)
    .select("devolucion_id, estado")
    .single<FilaDevolucionActualizada>();

  if (error || !data) {
    return { ok: false, error: "NX-SYS-001" };
  }

  return { ok: true, data };
}
