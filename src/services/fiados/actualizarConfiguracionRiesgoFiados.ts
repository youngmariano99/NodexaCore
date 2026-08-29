"use server";

import { z } from "zod";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { RolUsuario } from "@/services/autenticacion/tipos";
import type { EstadoActualizarConfiguracionRiesgo } from "./tipos";

const esquemaConfiguracionRiesgo = z.object({
  modoFacturacionEstimada: z.enum(["automatico", "manual"]),
  facturacionManualMonto: z.coerce.number().min(0, "El monto no puede ser negativo."),
  topeDeudaTolerablePct: z.coerce.number().min(1, "El porcentaje mínimo es 1%.").max(100, "El porcentaje máximo es 100%."),
});

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
  cliente_id: string | null;
}

/**
 * Server Action para actualizar la configuración de riesgo crediticio y facturación estimada del comercio.
 * Exporta únicamente la función asíncrona para cumplir con las reglas de Next.js ("use server").
 */
export async function actualizarConfiguracionRiesgoFiados(
  _estadoPrevio: EstadoActualizarConfiguracionRiesgo,
  formData: FormData
): Promise<EstadoActualizarConfiguracionRiesgo> {
  const resultado = esquemaConfiguracionRiesgo.safeParse({
    modoFacturacionEstimada: formData.get("modo_facturacion_estimada"),
    facturacionManualMonto: formData.get("facturacion_manual_monto"),
    topeDeudaTolerablePct: formData.get("tope_deuda_tolerable_pct"),
  });

  if (!resultado.success) {
    return { error: "NX-SYS-006", exito: false };
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

  if (!solicitante || !solicitante.cliente_id || solicitante.rol !== "comerciante") {
    return { error: "NX-SYS-003", exito: false };
  }

  // Obtener estado anterior para auditoría
  const { data: clientePrevio } = await supabase
    .from("clientes")
    .select("modo_facturacion_estimada, facturacion_manual_monto, tope_deuda_tolerable_pct")
    .eq("cliente_id", solicitante.cliente_id)
    .single();

  const { error: errorUpdate } = await supabase
    .from("clientes")
    .update({
      modo_facturacion_estimada: resultado.data.modoFacturacionEstimada,
      facturacion_manual_monto: resultado.data.facturacionManualMonto,
      tope_deuda_tolerable_pct: resultado.data.topeDeudaTolerablePct,
    })
    .eq("cliente_id", solicitante.cliente_id);

  if (errorUpdate) {
    return { error: "NX-SYS-001", exito: false };
  }

  // Registrar auditoría por diff
  registrarDiff({
    clienteId: solicitante.cliente_id,
    usuarioId: solicitante.usuario_id,
    tablaAfectada: "clientes",
    registroId: solicitante.cliente_id,
    campoModificado: "configuracion_riesgo_fiados",
    valorAnterior: JSON.stringify(clientePrevio),
    valorNuevo: JSON.stringify(resultado.data),
  });

  return { error: null, exito: true };
}
