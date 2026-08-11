import type { SupabaseClient } from "@supabase/supabase-js";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import type { ResultadoRepositorio } from "@/repositories/base/tipos";

export type ConceptoAjusteFacturacion = "pack_sku" | "recarga_ia";

export interface DatosAjusteFacturacion {
  clienteId: string;
  usuarioId: string;
  concepto: ConceptoAjusteFacturacion;
  monto: number;
}

export interface FilaAjusteFacturacion {
  ajuste_facturacion_id: string;
  cliente_id: string;
  concepto: ConceptoAjusteFacturacion;
  monto: number;
  periodo_facturado: string;
}

/**
 * Primer día del mes siguiente al actual (docs/SCHEMA.md §17
 * `ajustes_facturacion.periodo_facturado`): el ajuste se cobra en el
 * PRÓXIMO vencimiento, nunca en el período vigente — mismo criterio de
 * "período" que ya usa `clientes.ia_periodo_actual`
 * (`date_trunc('month', now())`), un mes adelante. Se calcula en UTC para no
 * depender de la zona horaria del proceso Node.
 */
function calcularProximoPeriodoFacturacion(): string {
  const ahora = new Date();
  const proximoPeriodo = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() + 1, 1));
  return proximoPeriodo.toISOString().slice(0, 10);
}

/**
 * Registra un ajuste monetario sobre el próximo período de facturación de
 * un comercio (docs/BACKLOG.md "Actualización del próximo período de
 * facturación en ampliaciones", Componente `actualizarFacturacionRecurrente`).
 * No es una Server Action pública ni valida sesión/rol por su cuenta: es un
 * helper interno invocado desde `ampliarLimiteSku.ts`/`ampliarCuotaIA.ts`
 * DESPUÉS de que esas funciones ya autorizaron al solicitante como
 * `admin_nodexa` y confirmaron el cambio real de límite/cuota — mismo
 * criterio de composición que `registrarDiff` (helper transversal, no un
 * punto de entrada propio). El `supabase` recibido debe ser el cliente de
 * sesión del admin (la política `ajustes_facturacion_insert_admin` exige
 * `es_admin_nodexa()`), nunca `service_role`.
 *
 * Tabla append-only (docs/SCHEMA.md §17): no hay operación de "corregir" un
 * ajuste ya emitido, solo de crear uno nuevo.
 */
export async function actualizarFacturacionRecurrente(
  supabase: SupabaseClient,
  datos: DatosAjusteFacturacion,
): Promise<ResultadoRepositorio<FilaAjusteFacturacion>> {
  const { data: ajuste, error } = await supabase
    .from("ajustes_facturacion")
    .insert({
      cliente_id: datos.clienteId,
      concepto: datos.concepto,
      monto: datos.monto,
      periodo_facturado: calcularProximoPeriodoFacturacion(),
    })
    .select("ajuste_facturacion_id, cliente_id, concepto, monto, periodo_facturado")
    .single<FilaAjusteFacturacion>();

  if (error || !ajuste) {
    return { ok: false, error: "NX-SYS-001" };
  }

  registrarDiff({
    clienteId: datos.clienteId,
    usuarioId: datos.usuarioId,
    tablaAfectada: "ajustes_facturacion",
    registroId: ajuste.ajuste_facturacion_id,
    campoModificado: "monto",
    valorAnterior: null,
    valorNuevo: JSON.stringify({
      concepto: ajuste.concepto,
      monto: ajuste.monto,
      periodoFacturado: ajuste.periodo_facturado,
    }),
  });

  return { ok: true, data: ajuste };
}
