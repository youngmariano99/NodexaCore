"use server";

import { z } from "zod";

import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { EstadoActualizarPreciosLote } from "@/services/productos/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

const esquemaActualizarPreciosLote = z.object({
  tipoFiltro: z.enum(["categoria_id", "marca_id", "proveedor_id", "todos"], {
    message: "El tipo de filtro no es válido.",
  }),
  filtroId: z.string().uuid("El identificador del filtro debe ser un UUID válido.").nullable().optional(),
  tipoAjuste: z.enum(["porcentaje", "monto"], {
    message: "El tipo de ajuste no es válido.",
  }),
  valor: z.number({ message: "El valor de cambio es obligatorio." }),
});

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
  cliente_id: string | null;
}

/**
 * Server Action para actualización masiva de precios en lote.
 * Realiza una llamada atómica a Postgres (fn_actualizar_precios_lote) y registra auditoría.
 */
export async function actualizarPreciosLote(
  _estadoPrevio: EstadoActualizarPreciosLote,
  formData: FormData,
): Promise<EstadoActualizarPreciosLote> {
  const rawFiltroId = formData.get("filtroId");
  const rawValor = formData.get("valor");

  const resultado = esquemaActualizarPreciosLote.safeParse({
    tipoFiltro: formData.get("tipoFiltro"),
    filtroId: rawFiltroId ? rawFiltroId : null,
    tipoAjuste: formData.get("tipoAjuste"),
    valor: rawValor ? Number(rawValor) : undefined,
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

  const clienteId = solicitante.cliente_id;

  // Llamada atómica al procedimiento almacenado para actualizar en lote y auditar
  const { data: cantidadAfectada, error: errorRpc } = await supabase.rpc(
    "fn_actualizar_precios_lote",
    {
      p_cliente_id: clienteId,
      p_usuario_id: solicitante.usuario_id,
      p_tipo_filtro: resultado.data.tipoFiltro,
      p_filtro_id: resultado.data.filtroId,
      p_tipo_ajuste: resultado.data.tipoAjuste,
      p_valor: resultado.data.valor,
    },
  );

  if (errorRpc || cantidadAfectada === null) {
    return { error: "NX-SYS-001", exito: false };
  }

  return { error: null, exito: true, cantidadAfectada };
}
