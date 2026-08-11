import type { SupabaseClient } from "@supabase/supabase-js";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { verificarPertenenciaTenant } from "@/repositories/base/verificarPertenenciaTenant";
import type { ResultadoRepositorio } from "@/repositories/base/tipos";

const CODIGO_UNIQUE_VIOLATION_POSTGRES = "23505";

interface ErrorPostgres {
  code?: string;
}

function esUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as ErrorPostgres).code === CODIGO_UNIQUE_VIOLATION_POSTGRES;
}

export interface ContextoRepositorioClientesFinales {
  supabase: SupabaseClient;
  clienteIdJwt: string | null;
  usuarioId: string;
}

export interface DatosNuevoClienteFinal {
  clienteId: string;
  nombre: string;
  telefono: string | null;
}

export interface FilaClienteFinal {
  cliente_final_id: string;
  cliente_id: string;
  nombre: string;
  telefono: string | null;
  saldo_deudor: number;
}

/**
 * Alta de cliente final (docs/ROLES.md §2, fila "clientes_finales (fiados)":
 * `C` para comerciante y empleado). `saldo_deudor` nunca viaja en el insert:
 * la columna ya trae `DEFAULT 0` en docs/SCHEMA.md §9, y ese valor solo se
 * modifica después vía `movimientos_cuenta_corriente` (mismo criterio que
 * `actualizarClienteFinal`, que tampoco expone `saldo_deudor`).
 *
 * Duplicados de contacto (docs/ERRORS.md `NX-FIA-005`) no se pre-chequean
 * con un `SELECT`: se deja que `idx_clientesfinales_telefono_unico`
 * (supabase/migrations/20260811130000_...) falle y se traduce el `23505` acá
 * — mismo patrón anti-TOCTOU que `insertarProducto` sobre
 * `(cliente_id, sku)`. Un `telefono` `NULL` (opcional) nunca puede violar
 * ese índice parcial, así que un alta sin teléfono jamás dispara
 * `NX-FIA-005`.
 */
export async function insertarClienteFinal(
  supabase: SupabaseClient,
  datos: DatosNuevoClienteFinal,
): Promise<ResultadoRepositorio<FilaClienteFinal>> {
  const { data, error } = await supabase
    .from("clientes_finales")
    .insert({
      cliente_id: datos.clienteId,
      nombre: datos.nombre,
      telefono: datos.telefono,
    })
    .select("cliente_final_id, cliente_id, nombre, telefono, saldo_deudor")
    .single<FilaClienteFinal>();

  if (error || !data) {
    if (esUniqueViolation(error)) {
      return { ok: false, error: "NX-FIA-005" };
    }
    return { ok: false, error: "NX-SYS-001" };
  }

  return { ok: true, data };
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
