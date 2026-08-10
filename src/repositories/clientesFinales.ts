import type { SupabaseClient } from "@supabase/supabase-js";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { verificarPertenenciaTenant } from "@/repositories/base/verificarPertenenciaTenant";
import type { ResultadoRepositorio } from "@/repositories/base/tipos";

export interface ContextoRepositorioClientesFinales {
  supabase: SupabaseClient;
  clienteIdJwt: string | null;
  usuarioId: string;
}

export interface CambiosClienteFinal {
  nombre?: string;
  telefono?: string;
}

interface FilaClienteFinalActualizado {
  cliente_final_id: string;
  nombre: string;
  telefono: string | null;
}

/**
 * Edición de datos de contacto de un cliente final (docs/ROLES.md §2:
 * `clientes_finales` M exclusivo de `comerciante`, reforzado además por la
 * política RLS `clientes_finales_update_tenant`). Guard IDOR/BOLA
 * (docs/ROLES.md §3.8) antes de tocar la base: si el cliente final no
 * pertenece al tenant del solicitante, corta en NX-SYS-007 sin ejecutar el
 * UPDATE. No expone `saldo_deudor` acá: ese campo solo se modifica vía
 * `movimientos_cuenta_corriente` (docs/SCHEMA.md §10), no por edición directa.
 *
 * Registra un diff por cada campo efectivamente modificado con
 * `registrarDiff` (src/lib/auditoria/): corre después de confirmar el
 * UPDATE, vía `after()`, sin retrasar la respuesta ya armada para el cliente.
 */
export async function actualizarClienteFinal(
  clienteFinalId: string,
  cambios: CambiosClienteFinal,
  contexto: ContextoRepositorioClientesFinales,
): Promise<ResultadoRepositorio<FilaClienteFinalActualizado>> {
  const { supabase, clienteIdJwt, usuarioId } = contexto;

  if (!clienteIdJwt) {
    return { ok: false, error: "NX-SYS-007" };
  }

  const verificacion = await verificarPertenenciaTenant(clienteFinalId, clienteIdJwt, {
    supabase,
    tabla: "clientes_finales",
    usuarioId,
  });

  if (!verificacion.perteneceAlTenant) {
    return { ok: false, error: verificacion.error ?? "NX-SYS-007" };
  }

  const { data: filaAnterior } = await supabase
    .from("clientes_finales")
    .select("nombre, telefono")
    .eq("cliente_final_id", clienteFinalId)
    .maybeSingle<{ nombre: string; telefono: string | null }>();

  const { data, error } = await supabase
    .from("clientes_finales")
    .update(cambios)
    .eq("cliente_final_id", clienteFinalId)
    .select("cliente_final_id, nombre, telefono")
    .single<FilaClienteFinalActualizado>();

  if (error || !data) {
    return { ok: false, error: "NX-SYS-001" };
  }

  (Object.keys(cambios) as Array<keyof CambiosClienteFinal>).forEach((campo) => {
    registrarDiff({
      clienteId: clienteIdJwt,
      usuarioId,
      tablaAfectada: "clientes_finales",
      registroId: data.cliente_final_id,
      campoModificado: campo,
      valorAnterior: filaAnterior?.[campo] ?? null,
      valorNuevo: data[campo] ?? null,
    });
  });

  return { ok: true, data };
}
