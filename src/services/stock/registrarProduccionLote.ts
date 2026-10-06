"use server";

import { z } from "zod";

import { ErrorDeDominio, mapearError } from "@/lib/errores/mapearError";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { RolUsuario } from "@/services/autenticacion/tipos";

export interface EstadoRegistrarProduccion {
  exito: boolean;
  error?: string | null;
}

const esquemaRegistrarProduccion = z.object({
  receta_id: z.string().uuid("La receta es obligatoria."),
  cantidad_producida: z.coerce
    .number({ message: "La cantidad es obligatoria." })
    .int("La cantidad debe ser un número entero.")
    .positive("La cantidad debe ser mayor a cero."),
});

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
  cliente_id: string | null;
}

/**
 * Server Action para declarar la producción de un lote de un producto fabricado.
 * Lee la receta para determinar el rendimiento y los insumos requeridos.
 * Calcula el coeficiente de consumo y envía un batch de movimientos de stock
 * al RPC `fn_registrar_produccion_batch` para ejecutarse transaccionalmente.
 */
export async function registrarProduccionLote(
  _estadoPrevio: EstadoRegistrarProduccion,
  formData: FormData,
): Promise<EstadoRegistrarProduccion> {
  const resultado = esquemaRegistrarProduccion.safeParse({
    receta_id: formData.get("receta_id"),
    cantidad_producida: formData.get("cantidad_producida"),
  });

  if (!resultado.success) {
    return { error: "NX-SYS-006", exito: false };
  }

  const { receta_id, cantidad_producida } = resultado.data;

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

  // 1. Obtener la receta y sus insumos
  const { data: receta, error: errorReceta } = await supabase
    .from("recetas")
    .select("producto_id, rendimiento_lote, receta_insumos(insumo_producto_id, cantidad_utilizada)")
    .eq("receta_id", receta_id)
    .eq("cliente_id", solicitante.cliente_id)
    .is("eliminado_en", null)
    .single();

  if (errorReceta || !receta) {
    return { error: "NX-SYS-004", exito: false }; // Recurso no encontrado
  }

  const coeficiente = cantidad_producida / Number(receta.rendimiento_lote);

  // 2. Armar el payload JSON para el batch
  const movimientosBatch = [];

  // 2.a. Movimiento de ENTRADA para el producto fabricado
  movimientosBatch.push({
    producto_id: receta.producto_id,
    tipo: "entrada",
    cantidad: cantidad_producida,
  });

  // 2.b. Movimientos de SALIDA para los insumos
  const insumos = receta.receta_insumos;
  if (Array.isArray(insumos)) {
    for (const insumo of insumos) {
      const cantidadConsumida = Math.ceil(Number(insumo.cantidad_utilizada) * coeficiente);
      if (cantidadConsumida > 0) {
        movimientosBatch.push({
          producto_id: insumo.insumo_producto_id,
          tipo: "salida",
          cantidad: cantidadConsumida,
        });
      }
    }
  }

  // 3. Ejecutar el RPC transaccional
  const { error: errorRpc } = await supabase.rpc("fn_registrar_produccion_batch", {
    p_movimientos: movimientosBatch,
  });

  if (errorRpc) {
    if (errorRpc.code === "NX004") {
      return { error: "NX-PRD-004", exito: false }; // Stock insuficiente
    }
    const errorMapeado = mapearError(new ErrorDeDominio(errorRpc.message, errorRpc.code));
    return { error: errorMapeado.codigo, exito: false };
  }

  return { exito: true };
}