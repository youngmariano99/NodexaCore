import * as Sentry from "@sentry/nextjs";

import { crearClienteSupabaseAdmin } from "@/lib/supabase/server";

export interface DiffAuditoria {
  clienteId: string;
  usuarioId: string;
  tablaAfectada: string;
  registroId: string;
  campoModificado: string;
  valorAnterior?: string | null;
  valorNuevo?: string | null;
}

/**
 * Trazabilidad asíncrona (CLAUDE.md §4 "trazabilidad"). Usa el cliente
 * service_role porque se invoca desde after() — fuera del ciclo de vida de la
 * request, sin cookies de sesión disponibles — uso explícitamente habilitado
 * para jobs asíncronos de auditoría por docs/ROLES.md §3.9.
 */
export async function registrarDiffAuditoria(diff: DiffAuditoria): Promise<void> {
  const supabaseAdmin = crearClienteSupabaseAdmin();

  const { error } = await supabaseAdmin.from("auditoria_diffs").insert({
    cliente_id: diff.clienteId,
    usuario_id: diff.usuarioId,
    tabla_afectada: diff.tablaAfectada,
    registro_id: diff.registroId,
    campo_modificado: diff.campoModificado,
    valor_anterior: diff.valorAnterior ?? null,
    valor_nuevo: diff.valorNuevo ?? null,
  });

  if (error) {
    // No se repropaga: la auditoría es asíncrona (after()) y no debe afectar
    // una respuesta que el usuario ya recibió. Se reporta a Sentry para revisión.
    Sentry.captureException(error, { tags: { modulo: "auditoria_diffs" } });
  }
}
