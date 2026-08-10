import type { SupabaseClient } from "@supabase/supabase-js";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
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
 *
 * Registra el diff con `registrarDiff` (src/lib/auditoria/): corre después de
 * confirmar el UPDATE, vía `after()`, sin retrasar ni depender de la
 * respuesta ya armada para el cliente (CLAUDE.md §4 "trazabilidad").
 */
export async function actualizarEstadoDevolucion(
  devolucionId: string,
  nuevoEstado: EstadoDevolucion,
  contexto: ContextoRepositorioDevoluciones,
): Promise<ResultadoRepositorio<FilaDevolucionActualizada>> {
  const { supabase, clienteIdJwt, usuarioId } = contexto;

  if (!clienteIdJwt) {
    return { ok: false, error: "NX-SYS-007" };
  }

  const verificacion = await verificarPertenenciaTenant(devolucionId, clienteIdJwt, {
    supabase,
    tabla: "devoluciones",
    usuarioId,
  });

  if (!verificacion.perteneceAlTenant) {
    return { ok: false, error: verificacion.error ?? "NX-SYS-007" };
  }

  const { data: filaAnterior } = await supabase
    .from("devoluciones")
    .select("estado")
    .eq("devolucion_id", devolucionId)
    .maybeSingle<{ estado: EstadoDevolucion }>();

  const { data, error } = await supabase
    .from("devoluciones")
    .update({ estado: nuevoEstado })
    .eq("devolucion_id", devolucionId)
    .select("devolucion_id, estado")
    .single<FilaDevolucionActualizada>();

  if (error || !data) {
    return { ok: false, error: "NX-SYS-001" };
  }

  registrarDiff({
    clienteId: clienteIdJwt,
    usuarioId,
    tablaAfectada: "devoluciones",
    registroId: data.devolucion_id,
    campoModificado: "estado",
    valorAnterior: filaAnterior?.estado ?? null,
    valorNuevo: data.estado,
  });

  return { ok: true, data };
}
