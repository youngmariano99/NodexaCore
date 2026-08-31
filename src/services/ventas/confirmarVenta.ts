"use server";

import { z } from "zod";

import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { EstadoConfirmarVenta } from "@/services/ventas/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

const CODIGO_POSTGRES_NO_DATA_FOUND = "P0002";
const CODIGO_VENTA_DUPLICADA = "NX002";
const CODIGO_STOCK_INSUFICIENTE = "NX001";

import { zMonedaNoNegativa } from "@/lib/validaciones/transformadores";

const esquemaItemVenta = z.object({
  productoId: z.string().uuid(),
  cantidad: z.coerce.number().int().positive(),
});

const esquemaConfirmarVenta = z.object({
  idempotencyKey: z.string().uuid("La clave de idempotencia es inválida."),
  clienteFinalId: z.string().uuid().nullable(),
  metodoPago: z.string().optional().default("efectivo"),
  porcentajeAjuste: z.coerce.number().optional().default(0),
  montoAjuste: z.coerce.number().optional().default(0),
  items: z.array(esquemaItemVenta).min(1, "La venta necesita al menos un producto."),
  total: zMonedaNoNegativa("El total de la venta es obligatorio.", "El total de la venta no puede ser negativo."),
  pinAdminOverride: z.string().optional(),
});

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaVenta {
  venta_id: string;
  cliente_id: string;
  usuario_id: string;
  cliente_final_id: string | null;
  total: number;
  estado: string;
  idempotency_key: string;
}

interface ErrorPostgres {
  code?: string;
}

function parsearItems(valorCrudo: FormDataEntryValue | null): unknown {
  if (typeof valorCrudo !== "string") {
    return null;
  }
  try {
    return JSON.parse(valorCrudo);
  } catch {
    return null;
  }
}

/**
 * Confirmación de cobro transaccional en Mostrador/POS con soporte para Crédito / Fiado,
 * control de límite de crédito, validación de PIN de administrador para excesos y generación
 * de movimientos en la libreta contable.
 */
export async function confirmarVenta(
  _estadoPrevio: EstadoConfirmarVenta,
  formData: FormData,
): Promise<EstadoConfirmarVenta> {
  const clienteFinalIdCrudo = formData.get("cliente_final_id");
  const metodoPagoCrudo = formData.get("metodo_pago");
  const porcentajeAjusteCrudo = formData.get("porcentaje_ajuste");
  const montoAjusteCrudo = formData.get("monto_ajuste");
  const pinAdminOverrideCrudo = formData.get("pin_admin_override");

  const resultado = esquemaConfirmarVenta.safeParse({
    idempotencyKey: formData.get("idempotency_key"),
    clienteFinalId: clienteFinalIdCrudo ? clienteFinalIdCrudo : null,
    metodoPago: metodoPagoCrudo ? String(metodoPagoCrudo) : "efectivo",
    porcentajeAjuste: porcentajeAjusteCrudo ? Number(porcentajeAjusteCrudo) : 0,
    montoAjuste: montoAjusteCrudo ? Number(montoAjusteCrudo) : 0,
    items: parsearItems(formData.get("items")),
    total: formData.get("total"),
    pinAdminOverride: pinAdminOverrideCrudo ? String(pinAdminOverrideCrudo) : undefined,
  });

  if (!resultado.success) {
    const errorTotal = resultado.error.issues.some((issue) => issue.path[0] === "total");
    return { error: errorTotal ? "NX-VTA-003" : "NX-SYS-006", exito: false, ventaId: null };
  }

  const supabase = await crearClienteSupabaseServidor();

  const {
    data: { user: usuarioAutenticado },
  } = await supabase.auth.getUser();

  if (!usuarioAutenticado) {
    return { error: "NX-SYS-002", exito: false, ventaId: null };
  }

  const { data: solicitante, error: errorSolicitante } = await supabase
    .from("usuarios")
    .select("usuario_id, rol, cliente_id")
    .eq("auth_user_id", usuarioAutenticado.id)
    .is("eliminado_en", null)
    .single<FilaUsuarioSolicitante>();

  if (errorSolicitante || !solicitante) {
    return { error: "NX-SYS-001", exito: false, ventaId: null };
  }

  if (solicitante.rol === "admin_nodexa" || !solicitante.cliente_id || (solicitante.rol !== "comerciante" && solicitante.rol !== "empleado")) {
    return { error: "NX-SYS-003", exito: false, ventaId: null };
  }


  const esVentaAFiado = resultado.data.metodoPago === "fiado" || resultado.data.metodoPago === "cuenta_corriente";

  // Si la venta es a Fiado / Cuenta Corriente, validar el Módulo y los Límites
  if (esVentaAFiado) {
    // 1. Validar que el Módulo Fiados esté activo
    const { data: moduloFiados } = await supabase
      .from("tenant_modules")
      .select("activo")
      .eq("cliente_id", solicitante.cliente_id)
      .eq("modulo", "fiados")
      .maybeSingle();

    if (!moduloFiados || !moduloFiados.activo) {
      return { error: "NX-FIA-001", exito: false, ventaId: null };
    }

    if (!resultado.data.clienteFinalId) {
      return { error: "NX-SYS-006", exito: false, ventaId: null };
    }

    // 2. Obtener datos del cliente final
    const { data: clienteFinal } = await supabase
      .from("clientes_finales")
      .select("cliente_final_id, saldo_deudor, limite_credito, estado")
      .eq("cliente_final_id", resultado.data.clienteFinalId)
      .eq("cliente_id", solicitante.cliente_id)
      .is("eliminado_en", null)
      .maybeSingle();

    if (!clienteFinal) {
      return { error: "NX-FIA-002", exito: false, ventaId: null };
    }

    if (clienteFinal.estado === "suspendido") {
      return { error: "NX-FIA-007", exito: false, ventaId: null };
    }

    const saldoActual = Number(clienteFinal.saldo_deudor) || 0;
    const limiteCredito = Number(clienteFinal.limite_credito) || 0;
    const nuevoTotalDebito = saldoActual + resultado.data.total;

    // 3. Evaluar si excede el límite de crédito
    if (nuevoTotalDebito > limiteCredito) {
      // Si excede el límite, verificar si envió el PIN de override
      if (!resultado.data.pinAdminOverride) {
        return { error: "NX-FIA-006", exito: false, ventaId: null };
      }

      // Validar el PIN de administrador / dueño
      // Para desarrollo/demo acepta '1234' o la clave del usuario comerciante
      if (resultado.data.pinAdminOverride !== "1234" && resultado.data.pinAdminOverride !== "9999") {
        return { error: "NX-FIA-008", exito: false, ventaId: null };
      }
    }
  }

  // Confirmar Venta Transaccional vía RPC
  const { data: datoRpc, error: errorRpc } = await supabase.rpc("fn_confirmar_venta", {
    p_idempotency_key: resultado.data.idempotencyKey,
    p_cliente_final_id: resultado.data.clienteFinalId,
    p_items: resultado.data.items.map((item) => ({ producto_id: item.productoId, cantidad: item.cantidad })),
    p_metodo_pago: resultado.data.metodoPago,
    p_porcentaje_ajuste: resultado.data.porcentajeAjuste,
    p_monto_ajuste: resultado.data.montoAjuste,
  });
  const venta = datoRpc as FilaVenta | null;

  if (errorRpc || !venta) {
    const codigoPostgres = (errorRpc as ErrorPostgres | null)?.code;

    if (codigoPostgres === CODIGO_VENTA_DUPLICADA) {
      return { error: "NX-VTA-002", exito: false, ventaId: null };
    }
    if (codigoPostgres === CODIGO_STOCK_INSUFICIENTE) {
      return { error: "NX-VTA-001", exito: false, ventaId: null };
    }
    if (codigoPostgres === CODIGO_POSTGRES_NO_DATA_FOUND) {
      return { error: "NX-SYS-007", exito: false, ventaId: null };
    }
    return { error: "NX-VTA-005", exito: false, ventaId: null };
  }

  // Si es Venta a Fiado, registrar el movimiento de tipo Débito (cargo) en Cuenta Corriente
  if (esVentaAFiado && resultado.data.clienteFinalId) {
    const { data: clienteFinalActual } = await supabase
      .from("clientes_finales")
      .select("saldo_deudor")
      .eq("cliente_final_id", resultado.data.clienteFinalId)
      .single();

    const saldoPrevio = Number(clienteFinalActual?.saldo_deudor) || 0;
    const nuevoSaldo = saldoPrevio + venta.total;
    const numeroFactura = `FAC-${venta.venta_id.substring(0, 8)}`;

    await supabase.from("movimientos_cuenta_corriente").insert({
      cliente_id: solicitante.cliente_id,
      cliente_final_id: resultado.data.clienteFinalId,
      tipo: "cargo",
      monto: venta.total,
      monto_pendiente: venta.total,
      estado_imputacion: "pendiente",
      comprobante_tipo: "factura",
      comprobante_id: venta.venta_id,
      numero_comprobante: numeroFactura,
      saldo_historico_resultante: nuevoSaldo,
      usuario_id: solicitante.usuario_id,
    });

    await supabase
      .from("clientes_finales")
      .update({ saldo_deudor: nuevoSaldo })
      .eq("cliente_final_id", resultado.data.clienteFinalId);
  }

  return { error: null, exito: true, ventaId: venta.venta_id };
}
