"use server";

import { z } from "zod";

import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { ReglaMetodoPago } from "@/lib/dominio/ventas/calcularTotalVenta";
import type { RolUsuario } from "@/services/autenticacion/tipos";

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
  cliente_id: string | null;
}

const esquemaReglaMetodoPago = z.object({
  metodoPago: z.string().min(1, "El identificador del método de pago es obligatorio."),
  etiqueta: z.string().min(1, "La etiqueta es obligatoria."),
  tipoAjuste: z.enum(["descuento", "recargo", "ninguno"]),
  porcentaje: z.coerce
    .number()
    .min(0, "El porcentaje no puede ser negativo.")
    .max(100, "El porcentaje no puede superar el 100%."),
  activo: z.boolean(),
});

const esquemaActualizarMetodosPago = z.array(esquemaReglaMetodoPago).min(1, "Debe existir al menos un método de pago.");

export interface ResultadoActualizarMetodosPago {
  ok: boolean;
  error?: string;
}

export async function actualizarMetodosPago(
  reglas: ReglaMetodoPago[]
): Promise<ResultadoActualizarMetodosPago> {
  const supabase = await crearClienteSupabaseServidor();

  const {
    data: { user: usuarioAutenticado },
  } = await supabase.auth.getUser();

  if (!usuarioAutenticado) {
    return { ok: false, error: "NX-SYS-002" };
  }

  const { data: solicitante, error: errorUsuario } = await supabase
    .from("usuarios")
    .select("rol, cliente_id")
    .eq("auth_user_id", usuarioAutenticado.id)
    .is("eliminado_en", null)
    .single<FilaUsuarioSolicitante>();

  if (errorUsuario || !solicitante || solicitante.rol !== "comerciante" || !solicitante.cliente_id) {
    return { ok: false, error: "NX-SYS-003" };
  }

  const validacion = esquemaActualizarMetodosPago.safeParse(reglas);
  if (!validacion.success) {
    return { ok: false, error: validacion.error.issues[0]?.message || "NX-SYS-001" };
  }

  // 1. Intentar vía función RPC con SECURITY DEFINER (estándar multi-tenant de Nodexa Core)
  const { data: dataRpc, error: errorRpc } = await supabase.rpc("fn_actualizar_metodos_pago", {
    p_configuracion: validacion.data,
  });

  if (!errorRpc && dataRpc) {
    return { ok: true };
  }

  // 2. Fallback a UPDATE directo
  const { data: filasActualizadas, error: errorUpdate } = await supabase
    .from("clientes")
    .update({
      configuracion_metodos_pago: validacion.data,
    })
    .eq("cliente_id", solicitante.cliente_id)
    .select("cliente_id");

  if (errorUpdate || !filasActualizadas || filasActualizadas.length === 0) {
    console.error("[actualizarMetodosPago] Error en Supabase:", {
      errorRpc,
      errorUpdate,
      filasActualizadas,
    });
    return { ok: false, error: "NX-SYS-001" };
  }

  return { ok: true };
}
