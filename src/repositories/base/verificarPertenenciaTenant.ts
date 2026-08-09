import * as Sentry from "@sentry/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

import { registrarDiffAuditoria } from "@/repositories/auditoria";

/**
 * Tablas de negocio con guard de pertenencia habilitado en esta estación
 * (docs/ROLES.md §3.8). Todas tienen columna `cliente_id` propia.
 */
export type TablaConGuardTenant = "ventas" | "devoluciones" | "clientes_finales";

const COLUMNA_ID_POR_TABLA: Record<TablaConGuardTenant, string> = {
  ventas: "venta_id",
  devoluciones: "devolucion_id",
  clientes_finales: "cliente_final_id",
};

export interface OpcionesVerificarPertenenciaTenant {
  supabase: SupabaseClient;
  tabla: TablaConGuardTenant;
  /** Si se provee, el intento cruzado además queda registrado en auditoria_diffs (no solo Sentry). */
  usuarioId?: string;
}

export interface ResultadoVerificacionTenant {
  perteneceAlTenant: boolean;
  error: "NX-SYS-007" | null;
}

/**
 * Defensa en profundidad ante IDOR/BOLA (docs/ROLES.md §3.8): RLS es la
 * autoridad final en la base, pero toda mutación de repositorio debe validar
 * explícitamente que el recurso pertenece al `cliente_id` del JWT ANTES de
 * tocar la base, para devolver el error de negocio normalizado NX-SYS-007
 * (docs/ERRORS.md) en vez de dejar que RLS aborte con un error crudo de
 * Postgres. Una sola consulta con id + cliente_id en el WHERE: si no
 * devuelve fila, no se distingue entre "no existe" y "es de otro tenant"
 * (evita filtrar existencia de recursos ajenos, mismo patrón que ROLES.md §3.8).
 */
export async function verificarPertenenciaTenant(
  recursoId: string,
  clienteIdJwt: string | null,
  opciones: OpcionesVerificarPertenenciaTenant,
): Promise<ResultadoVerificacionTenant> {
  if (!clienteIdJwt) {
    await registrarIntentoAccesoCruzado(recursoId, clienteIdJwt, opciones);
    return { perteneceAlTenant: false, error: "NX-SYS-007" };
  }

  const columnaId = COLUMNA_ID_POR_TABLA[opciones.tabla];

  const { data, error } = await opciones.supabase
    .from(opciones.tabla)
    .select(columnaId)
    .eq(columnaId, recursoId)
    .eq("cliente_id", clienteIdJwt)
    .maybeSingle<Record<string, string>>();

  if (error || !data) {
    await registrarIntentoAccesoCruzado(recursoId, clienteIdJwt, opciones);
    return { perteneceAlTenant: false, error: "NX-SYS-007" };
  }

  return { perteneceAlTenant: true, error: null };
}

async function registrarIntentoAccesoCruzado(
  recursoId: string,
  clienteIdJwt: string | null,
  { tabla, usuarioId }: OpcionesVerificarPertenenciaTenant,
): Promise<void> {
  Sentry.captureMessage("Intento de acceso IDOR/BOLA bloqueado por verificarPertenenciaTenant", {
    level: "warning",
    tags: { modulo: "seguridad", codigo_error: "NX-SYS-007", tabla },
    extra: { recursoId, clienteIdJwt },
  });

  if (clienteIdJwt && usuarioId) {
    await registrarDiffAuditoria({
      clienteId: clienteIdJwt,
      usuarioId,
      tablaAfectada: tabla,
      registroId: recursoId,
      campoModificado: "intento_acceso_cruzado",
      valorAnterior: null,
      valorNuevo: "NX-SYS-007",
    });
  }
}
