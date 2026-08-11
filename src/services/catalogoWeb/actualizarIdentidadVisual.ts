"use server";

import { z } from "zod";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { COLORES_PRIMARIOS_PERMITIDOS } from "@/services/catalogoWeb/coloresPrimariosPermitidos";
import type { EstadoActualizarIdentidadVisual } from "@/services/catalogoWeb/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

const esquemaIdentidadVisual = z.object({
  logoUrl: z
    .union([z.string().trim().url("La URL del logo no es válida."), z.literal("")])
    .transform((valor) => (valor === "" ? null : valor)),
  colorPrimario: z.enum(COLORES_PRIMARIOS_PERMITIDOS, {
    message: "Ese color no está permitido. Elegí uno de la paleta disponible.",
  }),
});

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaClienteIdentidadPrevia {
  logo_url: string | null;
  color_primario: string | null;
}

interface FilaClienteIdentidad {
  cliente_id: string;
  logo_url: string | null;
  color_primario: string | null;
}

interface ErrorPostgres {
  code?: string;
}

const CODIGO_POSTGRES_SIN_PERMISO = "P0001";
const CODIGO_POSTGRES_NO_DATA_FOUND = "P0002";

/**
 * Personalización visual de la vidriera pública (docs/ROLES.md §2, fila
 * "clientes (propio tenant)": `L·M` para comerciante; `empleado` solo
 * lectura básica, sin `M`). La mutación real vive en el RPC `SECURITY
 * DEFINER` `fn_actualizar_identidad_visual`
 * (supabase/migrations/20260810160000_...): esta Server Action valida y
 * arma el payload, pero el `UPDATE` a `clientes` ocurre íntegramente adentro
 * de ese RPC, que solo puede tocar `logo_url`/`color_primario` (nunca la
 * fila completa) y siempre sobre el `cliente_id` de la sesión, nunca uno
 * recibido por parámetro. Ver el comentario de esa migración para el
 * razonamiento completo de por qué se necesita `SECURITY DEFINER` acá (RLS
 * no puede restringir por columna).
 *
 * `colorPrimario` se valida contra `COLORES_PRIMARIOS_PERMITIDOS` (Paso 2):
 * un valor fuera de esa paleta —incluido cualquier púrpura/violeta/índigo—
 * nunca llega a invocar el RPC, Zod lo rechaza acá con `NX-SYS-006`
 * (Criterio de Aceptación 2).
 */
export async function actualizarIdentidadVisual(
  _estadoPrevio: EstadoActualizarIdentidadVisual,
  formData: FormData,
): Promise<EstadoActualizarIdentidadVisual> {
  const resultado = esquemaIdentidadVisual.safeParse({
    logoUrl: formData.get("logo_url") ?? "",
    colorPrimario: formData.get("color_primario"),
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
    .select("logo_url, color_primario")
    .eq("cliente_id", clienteId)
    .maybeSingle<FilaClienteIdentidadPrevia>();

  const { data: datoRpc, error: errorRpc } = await supabase.rpc("fn_actualizar_identidad_visual", {
    p_logo_url: resultado.data.logoUrl,
    p_color_primario: resultado.data.colorPrimario,
  });
  const cliente = datoRpc as FilaClienteIdentidad | null;

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
    campoModificado: "logo_url",
    valorAnterior: valoresPrevios?.logo_url ?? null,
    valorNuevo: cliente.logo_url,
  });

  registrarDiff({
    clienteId,
    usuarioId: solicitante.usuario_id,
    tablaAfectada: "clientes",
    registroId: clienteId,
    campoModificado: "color_primario",
    valorAnterior: valoresPrevios?.color_primario ?? null,
    valorNuevo: cliente.color_primario,
  });

  return { error: null, exito: true };
}
