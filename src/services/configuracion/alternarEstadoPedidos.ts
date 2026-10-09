"use server";

import { z } from "zod";
import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { RolUsuario } from "@/services/autenticacion/tipos";

export interface EstadoAlternarEstadoPedidos {
  error: string | null;
  exito: boolean;
  nuevoEstado?: boolean;
}

const esquemaEstadoPedidos = z.object({
  aceptandoPedidos: z.boolean(),
});

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaClienteEstadoPrevia {
  configuracion_plantilla: Record<string, unknown>;
}

interface FilaClienteEstado {
  cliente_id: string;
  configuracion_plantilla: Record<string, unknown>;
}

interface ErrorPostgres {
  code?: string;
}

const CODIGO_POSTGRES_SIN_PERMISO = "P0001";
const CODIGO_POSTGRES_NO_DATA_FOUND = "P0002";

export async function alternarEstadoPedidos(
  estadoPrevio: EstadoAlternarEstadoPedidos,
  formData: FormData,
): Promise<EstadoAlternarEstadoPedidos> {
  const resultado = esquemaEstadoPedidos.safeParse({
    aceptandoPedidos: formData.get("aceptando_pedidos") === "true",
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

  if (solicitante.rol !== "comerciante" || !solicitante.cliente_id) {
    return { error: "NX-SYS-003", exito: false };
  }

  const clienteId = solicitante.cliente_id;

  const { data: valoresPrevios } = await supabase
    .from("clientes")
    .select("configuracion_plantilla")
    .eq("cliente_id", clienteId)
    .maybeSingle<FilaClienteEstadoPrevia>();

  const estadoPrevioBooleano =
    (valoresPrevios?.configuracion_plantilla?.aceptando_pedidos as boolean) ?? false;

  const { data: datoRpc, error: errorRpc } = await supabase.rpc("fn_alternar_estado_pedidos", {
    p_aceptando_pedidos: resultado.data.aceptandoPedidos,
  });
  const cliente = datoRpc as FilaClienteEstado | null;

  if (errorRpc || !cliente) {
    const codigoPostgres = (errorRpc as ErrorPostgres | null)?.code;

    if (codigoPostgres === CODIGO_POSTGRES_SIN_PERMISO) {
      return { error: "NX-SYS-003", exito: false };
    }
    if (codigoPostgres === CODIGO_POSTGRES_NO_DATA_FOUND) {
      return { error: "NX-SYS-007", exito: false };
    }
    return { error: "NX-SYS-001", exito: false };
  }

  registrarDiff({
    clienteId,
    usuarioId: solicitante.usuario_id,
    tablaAfectada: "clientes",
    registroId: clienteId,
    campoModificado: "configuracion_plantilla.aceptando_pedidos",
    valorAnterior: String(estadoPrevioBooleano),
    valorNuevo: String(resultado.data.aceptandoPedidos),
  });

  return { error: null, exito: true, nuevoEstado: resultado.data.aceptandoPedidos };
}
