"use server";

import { z } from "zod";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { obtenerDebitosPendientes } from "@/repositories/movimientosCuentaCorrienteRepository";
import { procesarImputacionFifo } from "@/services/fiados/procesarImputacionFifo";
import type { EstadoRegistrarPagoCuentaCorriente } from "@/services/fiados/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

const esquemaRegistrarPago = z.object({
  clienteFinalId: z.string().uuid("El cliente final es obligatorio."),
  monto: z.coerce.number({ message: "El monto es obligatorio." }).positive("El monto debe ser mayor a cero."),
  metodoPago: z.string().optional().default("efectivo"),
  debitoEspecificoId: z.string().uuid().optional(),
});

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
  cliente_id: string | null;
}

/**
 * Registro de cobro en cuenta corriente con Imputación Contable (FIFO o Específica por producto/factura).
 * Soporta Cobranza Residual: permite cobrar saldos pendientes existentes aun si el módulo fiados está inactivo.
 */
export async function registrarPagoCuentaCorriente(
  _estadoPrevio: EstadoRegistrarPagoCuentaCorriente,
  formData: FormData,
): Promise<EstadoRegistrarPagoCuentaCorriente> {
  const rawDebitoEspecifico = formData.get("debito_especifico_id");
  const resultado = esquemaRegistrarPago.safeParse({
    clienteFinalId: formData.get("cliente_final_id"),
    monto: formData.get("monto"),
    metodoPago: formData.get("metodo_pago") ?? "efectivo",
    debitoEspecificoId: rawDebitoEspecifico && String(rawDebitoEspecifico).trim() !== "" ? String(rawDebitoEspecifico) : undefined,
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

  const { data: solicitante } = await supabase
    .from("usuarios")
    .select("usuario_id, rol, cliente_id")
    .eq("auth_user_id", usuarioAutenticado.id)
    .is("eliminado_en", null)
    .single<FilaUsuarioSolicitante>();

  if (!solicitante || !solicitante.cliente_id) {
    return { error: "NX-SYS-003", exito: false };
  }

  // 1. Obtener cliente final y verificar saldo actual
  const { data: clienteFinal, error: errorCliente } = await supabase
    .from("clientes_finales")
    .select("cliente_final_id, cliente_id, saldo_deudor, nombre")
    .eq("cliente_final_id", resultado.data.clienteFinalId)
    .eq("cliente_id", solicitante.cliente_id)
    .is("eliminado_en", null)
    .maybeSingle();

  if (errorCliente || !clienteFinal) {
    return { error: "NX-FIA-002", exito: false };
  }

  const saldoActual = Number(clienteFinal.saldo_deudor) || 0;
  if (resultado.data.monto > saldoActual) {
    return { error: "NX-FIA-003", exito: false };
  }

  // 2. Obtener débitos pendientes del cliente
  const resDebitos = await obtenerDebitosPendientes(supabase, clienteFinal.cliente_final_id);
  if (!resDebitos.ok) {
    return { error: "NX-SYS-001", exito: false };
  }

  const debitosPendientes = (resDebitos.data ?? []).map((d) => ({
    movimientoCcId: d.movimiento_cc_id,
    montoPendiente: Number(d.monto_pendiente),
    creadoEn: d.creado_en,
    comprobanteTipo: d.comprobante_tipo,
    numeroComprobante: d.numero_comprobante,
  }));

  // 3. Ejecutar cálculo de imputación (FIFO o Específica)
  const calculoImputacion = procesarImputacionFifo(
    debitosPendientes,
    resultado.data.monto,
    resultado.data.debitoEspecificoId
  );

  const nuevoSaldoDeudor = Number((saldoActual - resultado.data.monto).toFixed(2));
  const numeroRecibo = `REC-${Date.now().toString().slice(-6)}`;

  // 4. Insertar movimiento de cobro tipo CREDITO (pago)
  const { data: nuevoPago, error: errorInsertPago } = await supabase
    .from("movimientos_cuenta_corriente")
    .insert({
      cliente_id: solicitante.cliente_id,
      cliente_final_id: clienteFinal.cliente_final_id,
      tipo: "pago",
      monto: resultado.data.monto,
      monto_pendiente: 0,
      estado_imputacion: "total",
      comprobante_tipo: "recibo_cobro",
      numero_comprobante: numeroRecibo,
      saldo_historico_resultante: nuevoSaldoDeudor,
      metodo_pago: resultado.data.metodoPago,
      usuario_id: solicitante.usuario_id,
    })
    .select("movimiento_cc_id")
    .single();

  if (errorInsertPago || !nuevoPago) {
    return { error: "NX-SYS-001", exito: false };
  }

  // 5. Imputaciones M:N e inserción en imputaciones_comprobantes
  for (const imp of calculoImputacion.imputaciones) {
    await supabase.from("imputaciones_comprobantes").insert({
      cliente_id: solicitante.cliente_id,
      movimiento_credito_id: nuevoPago.movimiento_cc_id,
      movimiento_debito_id: imp.movimientoDebitoId,
      monto_imputado: imp.montoImputado,
    });

    await supabase
      .from("movimientos_cuenta_corriente")
      .update({
        monto_pendiente: imp.nuevoMontoPendiente,
        estado_imputacion: imp.nuevoEstadoImputacion,
      })
      .eq("movimiento_cc_id", imp.movimientoDebitoId);
  }

  // 6. Actualizar saldo_deudor en cliente final
  await supabase
    .from("clientes_finales")
    .update({ saldo_deudor: nuevoSaldoDeudor })
    .eq("cliente_final_id", clienteFinal.cliente_final_id);

  // Auditoría
  registrarDiff({
    clienteId: solicitante.cliente_id,
    usuarioId: solicitante.usuario_id,
    tablaAfectada: "movimientos_cuenta_corriente",
    registroId: nuevoPago.movimiento_cc_id,
    campoModificado: "pago",
    valorAnterior: String(saldoActual),
    valorNuevo: String(nuevoSaldoDeudor),
  });

  return { error: null, exito: true };
}
