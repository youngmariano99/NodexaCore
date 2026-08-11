"use server";

import { z } from "zod";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { COSTO_RECARGA_IA_ARS, CUOTA_IA_POR_RECARGA } from "@/lib/dominio/facturacion/calcularCostoPackSku";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { ResultadoRepositorio } from "@/repositories/base/tipos";
import { actualizarFacturacionRecurrente } from "@/services/admin/actualizarFacturacionRecurrente";
import type { RolUsuario } from "@/services/autenticacion/tipos";

const esquemaAmpliarCuotaIA = z.object({
  clienteId: z.string().uuid("El cliente_id debe ser un UUID válido."),
});

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
}

interface FilaClienteCuotaIa {
  cuota_mensual_ia: number;
}

interface ResultadoAmpliarCuotaIA {
  cuotaMensualIa: number;
  ajusteFacturacion: { monto: number; periodoFacturado: string };
}

/**
 * Equivalente de `ampliarLimiteSku.ts` para el paquete de recarga de cuota
 * mensual de IA (docs/ROLES.md §2, fila "Ampliación limite_sku / cuota IA":
 * `M` exclusivo de admin_nodexa; docs/ERRORS.md `NX-IA-002`, "paquete de
 * recarga (+40 consultas)"). No existía ninguna Server Action para esta
 * ampliación todavía — solo el consumo (`registrarConsumoIa`) y la
 * visualización (`obtenerUsoCuotaIA`) estaban construidos.
 *
 * A diferencia del pack de SKU, la recarga de IA no tiene esquema
 * escalonado: cada paquete cuesta el mismo monto fijo
 * (`COSTO_RECARGA_IA_ARS`) sin importar cuántos se hayan contratado antes —
 * decisión de negocio confirmada explícitamente con el usuario en esta
 * estación (no había ningún monto de referencia en el repo para este
 * concepto). El UPDATE de `cuota_mensual_ia` corre con el cliente de sesión:
 * `clientes_update_admin` ya autoriza `es_admin_nodexa()` sobre cualquier
 * columna de `clientes`, sin necesitar `service_role`.
 */
export async function ampliarCuotaIA(clienteId: string): Promise<ResultadoRepositorio<ResultadoAmpliarCuotaIA>> {
  const resultado = esquemaAmpliarCuotaIA.safeParse({ clienteId });

  if (!resultado.success) {
    return { ok: false, error: "NX-SYS-006" };
  }

  const supabase = await crearClienteSupabaseServidor();

  const {
    data: { user: usuarioAutenticado },
  } = await supabase.auth.getUser();

  if (!usuarioAutenticado) {
    return { ok: false, error: "NX-SYS-002" };
  }

  const { data: solicitante, error: errorSolicitante } = await supabase
    .from("usuarios")
    .select("usuario_id, rol")
    .eq("auth_user_id", usuarioAutenticado.id)
    .is("eliminado_en", null)
    .single<FilaUsuarioSolicitante>();

  if (errorSolicitante || !solicitante) {
    return { ok: false, error: "NX-SYS-001" };
  }

  if (solicitante.rol !== "admin_nodexa") {
    return { ok: false, error: "NX-SYS-003" };
  }

  const { data: cliente, error: errorCliente } = await supabase
    .from("clientes")
    .select("cuota_mensual_ia")
    .eq("cliente_id", resultado.data.clienteId)
    .is("eliminado_en", null)
    .single<FilaClienteCuotaIa>();

  if (errorCliente || !cliente) {
    return { ok: false, error: "NX-SYS-004" };
  }

  const cuotaAnterior = cliente.cuota_mensual_ia;
  const nuevaCuota = cuotaAnterior + CUOTA_IA_POR_RECARGA;

  const { data: clienteActualizado, error: errorActualizacion } = await supabase
    .from("clientes")
    .update({ cuota_mensual_ia: nuevaCuota })
    .eq("cliente_id", resultado.data.clienteId)
    .select("cuota_mensual_ia")
    .single<FilaClienteCuotaIa>();

  if (errorActualizacion || !clienteActualizado) {
    return { ok: false, error: "NX-SYS-001" };
  }

  registrarDiff({
    clienteId: resultado.data.clienteId,
    usuarioId: solicitante.usuario_id,
    tablaAfectada: "clientes",
    registroId: resultado.data.clienteId,
    campoModificado: "cuota_mensual_ia",
    valorAnterior: String(cuotaAnterior),
    valorNuevo: String(clienteActualizado.cuota_mensual_ia),
  });

  const resultadoAjuste = await actualizarFacturacionRecurrente(supabase, {
    clienteId: resultado.data.clienteId,
    usuarioId: solicitante.usuario_id,
    concepto: "recarga_ia",
    monto: COSTO_RECARGA_IA_ARS,
  });

  if (!resultadoAjuste.ok) {
    return { ok: false, error: resultadoAjuste.error };
  }

  return {
    ok: true,
    data: {
      cuotaMensualIa: clienteActualizado.cuota_mensual_ia,
      ajusteFacturacion: {
        monto: resultadoAjuste.data.monto,
        periodoFacturado: resultadoAjuste.data.periodo_facturado,
      },
    },
  };
}
