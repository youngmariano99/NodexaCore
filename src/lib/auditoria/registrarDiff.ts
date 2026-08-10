import { after } from "next/server";
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
 * Helper canónico de auditoría asíncrona (CLAUDE.md §4 "trazabilidad":
 * "Auditoría Asíncrona registrando únicamente Diffs de base de datos").
 * Encapsula `after()` acá adentro para que el llamador nunca tenga que
 * importar `next/server` ni envolver el registro manualmente: alcanza con
 * `registrarDiff({...})` inmediatamente después de confirmar la mutación
 * principal. `after()` programa el callback para que corra DESPUÉS de que
 * Next.js haya enviado la respuesta al cliente — el insert en
 * `auditoria_diffs` nunca retrasa la respuesta de la Server Action ni la
 * revierte si falla, porque corre fuera del ciclo de vida de esa respuesta.
 *
 * Usa el cliente `service_role` porque corre fuera del contexto de la
 * request (sin cookies de sesión disponibles) — uso explícitamente
 * habilitado para jobs asíncronos de auditoría por docs/ROLES.md §3.9.
 *
 * `creado_en` (el timestamp del diff) no se pasa desde acá: la columna tiene
 * `DEFAULT now()` en docs/SCHEMA.md §16, así que queda completo sin
 * intervención del código de aplicación.
 */
export function registrarDiff(diff: DiffAuditoria): void {
  after(async () => {
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
      // No se repropaga: la mutación principal ya fue confirmada y
      // respondida antes de que este callback corra. Se reporta a Sentry
      // para revisión, sin afectar ni revertir la transacción ya cerrada.
      Sentry.captureException(error, { tags: { modulo: "auditoria_diffs" } });
    }
  });
}
