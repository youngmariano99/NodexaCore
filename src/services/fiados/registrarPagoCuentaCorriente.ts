"use server";

import { z } from "zod";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { EstadoRegistrarPagoCuentaCorriente } from "@/services/fiados/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

const CODIGO_POSTGRES_NO_DATA_FOUND = "P0002";
const CODIGO_MONTO_SUPERA_DEUDA = "NX003";

const esquemaRegistrarPago = z.object({
  clienteFinalId: z.string().uuid("El cliente final es obligatorio."),
  monto: z.coerce.number({ message: "El monto es obligatorio." }).positive("El monto debe ser mayor a cero."),
});

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaMovimientoCuentaCorriente {
  movimiento_cc_id: string;
  cliente_final_id: string;
  venta_id: string | null;
  tipo: "cargo" | "pago";
  monto: number;
  usuario_id: string;
}

interface ErrorPostgres {
  code?: string;
}

/**
 * Registro de pagos parciales o totales (docs/ROLES.md §2, fila
 * "movimientos_cuenta_corriente": `C` para comerciante, `C` — solo pagos —
 * para empleado; ambos habilitados acá, no hay distinción adicional que
 * hacer en esta Server Action porque el checklist no pide ninguna).
 *
 * El monto inválido (`<= 0`) se distingue con `NX-FIA-004` (Zod, Fail-Fast)
 * antes de tocar Supabase. La validación de `monto <= saldo_deudor`
 * (`NX-FIA-003`) NO se hace acá con una lectura previa: vive en la misma
 * sentencia `UPDATE` atómica dentro de `fn_registrar_pago_cuenta_corriente`
 * (supabase/migrations/20260811150000_...), evitando la ventana de carrera
 * de dos pagos concurrentes sobre el mismo cliente final. El RPC corre
 * `SECURITY DEFINER` porque `clientes_finales_update_tenant` bloquearía con
 * RLS crudo un pago registrado por un `empleado` — mismo criterio ya usado
 * por `fn_incrementar_saldo_deudor` en la estación de cargo a cuenta
 * corriente.
 */
export async function registrarPagoCuentaCorriente(
  _estadoPrevio: EstadoRegistrarPagoCuentaCorriente,
  formData: FormData,
): Promise<EstadoRegistrarPagoCuentaCorriente> {
  const resultado = esquemaRegistrarPago.safeParse({
    clienteFinalId: formData.get("cliente_final_id"),
    monto: formData.get("monto"),
  });

  if (!resultado.success) {
    const fallaMonto = resultado.error.issues.some((issue) => issue.path[0] === "monto");
    return { error: fallaMonto ? "NX-FIA-004" : "NX-SYS-006", exito: false };
  }

  const supabase = await crearClienteSupabaseServidor();

  const {
    data: { user: usuarioAutenticado },
  } = await supabase.auth.getUser();

  if (!usuarioAutenticado) {
    return { error: "NX-SYS-002", exito: false };
  }

  const { data: solicitante, error: errorSolicitante } = await supabase
    .from("usuarios")
    .select("usuario_id, rol, cliente_id")
    .eq("auth_user_id", usuarioAutenticado.id)
    .is("eliminado_en", null)
    .single<FilaUsuarioSolicitante>();

  if (errorSolicitante || !solicitante) {
    return { error: "NX-SYS-001", exito: false };
  }

  if ((solicitante.rol !== "comerciante" && solicitante.rol !== "empleado") || !solicitante.cliente_id) {
    return { error: "NX-SYS-003", exito: false };
  }

  const { data: datoRpc, error: errorRpc } = await supabase.rpc("fn_registrar_pago_cuenta_corriente", {
    p_cliente_final_id: resultado.data.clienteFinalId,
    p_monto: resultado.data.monto,
  });
  const movimiento = datoRpc as FilaMovimientoCuentaCorriente | null;

  if (errorRpc || !movimiento) {
    const codigoPostgres = (errorRpc as ErrorPostgres | null)?.code;

    if (codigoPostgres === CODIGO_MONTO_SUPERA_DEUDA) {
      return { error: "NX-FIA-003", exito: false };
    }
    if (codigoPostgres === CODIGO_POSTGRES_NO_DATA_FOUND) {
      return { error: "NX-FIA-002", exito: false };
    }
    return { error: "NX-SYS-001", exito: false };
  }

  registrarDiff({
    clienteId: solicitante.cliente_id,
    usuarioId: solicitante.usuario_id,
    tablaAfectada: "movimientos_cuenta_corriente",
    registroId: movimiento.movimiento_cc_id,
    campoModificado: "pago",
    valorAnterior: null,
    valorNuevo: String(movimiento.monto),
  });

  return { error: null, exito: true };
}
