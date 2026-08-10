"use server";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { verificarPertenenciaTenant } from "@/repositories/base/verificarPertenenciaTenant";
import type { EstadoEliminarProducto } from "@/services/productos/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaProductoEliminadoEn {
  eliminado_en: string | null;
}

interface FilaProductoDadoDeBaja {
  producto_id: string;
  eliminado_en: string;
}

/**
 * Baja lógica de producto (docs/ROLES.md §2, fila "productos — alta/edición/
 * baja": `B` exclusivo de `comerciante` — "`empleado` nunca ejecuta baja
 * lógica de productos", nota de matriz §2). Nunca ejecuta `DELETE` físico:
 * actualiza `eliminado_en = now()`, que es el filtro que ya excluyen las
 * consultas de listado activas (docs/SCHEMA.md §5, `idx_productos_cliente_activos`
 * y `contarProductosActivos` en `productosRepository.ts`, ambos `WHERE
 * eliminado_en IS NULL`) — no se necesita tocar ninguna consulta de listado
 * en esta estación porque ya filtran por esa columna.
 *
 * Guard IDOR/BOLA (docs/ROLES.md §3.8) vía `verificarPertenenciaTenant`
 * antes de tocar la base: si el producto es de otro tenant, corta en
 * NX-SYS-007. Si ya estaba dado de baja, corta en `NX-PRD-006` en vez de
 * reescribir `eliminado_en` (evita un diff sin sentido de timestamp a
 * timestamp) — mismo código que usa `actualizarProducto.ts` para bloquear
 * la edición de un producto ya eliminado.
 */
export async function eliminarProducto(
  productoId: string,
  _estadoPrevio: EstadoEliminarProducto,
  _formData: FormData,
): Promise<EstadoEliminarProducto> {
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

  const verificacion = await verificarPertenenciaTenant(productoId, clienteId, {
    supabase,
    tabla: "productos",
    usuarioId: solicitante.usuario_id,
  });

  if (!verificacion.perteneceAlTenant) {
    return { error: verificacion.error ?? "NX-SYS-007", exito: false };
  }

  const { data: filaAnterior } = await supabase
    .from("productos")
    .select("eliminado_en")
    .eq("producto_id", productoId)
    .maybeSingle<FilaProductoEliminadoEn>();

  if (filaAnterior?.eliminado_en) {
    return { error: "NX-PRD-006", exito: false };
  }

  const { data: productoEliminado, error: errorEliminacion } = await supabase
    .from("productos")
    .update({ eliminado_en: new Date().toISOString() })
    .eq("producto_id", productoId)
    .select("producto_id, eliminado_en")
    .single<FilaProductoDadoDeBaja>();

  if (errorEliminacion || !productoEliminado) {
    return { error: "NX-SYS-001", exito: false };
  }

  registrarDiff({
    clienteId,
    usuarioId: solicitante.usuario_id,
    tablaAfectada: "productos",
    registroId: productoEliminado.producto_id,
    campoModificado: "eliminado_en",
    valorAnterior: null,
    valorNuevo: productoEliminado.eliminado_en,
  });

  return { error: null, exito: true };
}
