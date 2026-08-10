"use server";

import { z } from "zod";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { EstadoRegistrarEntradaStock } from "@/services/stock/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

const CODIGO_POSTGRES_NO_DATA_FOUND = "P0002";

const esquemaRegistrarEntradaStock = z.object({
  producto_id: z.string().uuid("El producto es obligatorio."),
  cantidad: z.coerce
    .number({ message: "La cantidad es obligatoria." })
    .int("La cantidad debe ser un número entero.")
    .positive("La cantidad debe ser mayor a cero."),
});

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaMovimientoStock {
  movimiento_id: string;
  cliente_id: string;
  producto_id: string;
  usuario_id: string;
  tipo: "entrada" | "salida";
  cantidad: number;
  saldo_resultante: number;
}

interface ErrorPostgres {
  code?: string;
}

/**
 * Registro de entrada de stock (docs/ROLES.md §2, fila "movimientos_stock":
 * `C·L` para comerciante y empleado). El cálculo de `saldo_resultante` y el
 * `UPDATE` de `productos.stock_actual` viven en la función RPC
 * `registrar_entrada_stock` (supabase/migrations/20260810100000_...), no
 * acá: un `UPDATE ... RETURNING` de una sola fila en Postgres es atómico,
 * evitando la ventana de carrera de leer `stock_actual` en la app y recién
 * después escribir el nuevo valor (dos entradas concurrentes al mismo
 * producto perderían una actualización con ese patrón).
 *
 * El RPC corre `SECURITY INVOKER` y deriva `cliente_id`/`usuario_id` del JWT
 * de sesión adentro de la función: un producto de otro tenant no matchea su
 * `WHERE` y falla con `NO_DATA_FOUND` (SQLSTATE `P0002`), que acá se traduce
 * a `NX-SYS-007` — mismo criterio de "no distinguir no-existe de es-de-otro-
 * tenant" que `verificarPertenenciaTenant` (docs/ROLES.md §3.8), sin
 * necesitar una consulta de guard separada porque el RPC ya lo resuelve
 * dentro de la misma transacción que la escritura.
 */
export async function registrarEntradaStock(
  _estadoPrevio: EstadoRegistrarEntradaStock,
  formData: FormData,
): Promise<EstadoRegistrarEntradaStock> {
  const resultado = esquemaRegistrarEntradaStock.safeParse({
    producto_id: formData.get("producto_id"),
    cantidad: formData.get("cantidad"),
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

  const { data: datoRpc, error: errorRpc } = await supabase.rpc("registrar_entrada_stock", {
    p_producto_id: resultado.data.producto_id,
    p_cantidad: resultado.data.cantidad,
  });
  const movimiento = datoRpc as FilaMovimientoStock | null;

  if (errorRpc || !movimiento) {
    if ((errorRpc as ErrorPostgres | null)?.code === CODIGO_POSTGRES_NO_DATA_FOUND) {
      return { error: "NX-SYS-007", exito: false };
    }
    return { error: "NX-SYS-001", exito: false };
  }

  registrarDiff({
    clienteId: solicitante.cliente_id,
    usuarioId: solicitante.usuario_id,
    tablaAfectada: "movimientos_stock",
    registroId: movimiento.movimiento_id,
    campoModificado: "entrada",
    valorAnterior: null,
    valorNuevo: String(movimiento.saldo_resultante),
  });

  return { error: null, exito: true };
}
