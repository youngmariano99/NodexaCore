"use server";

import { z } from "zod";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { calcularNuevoSaldo } from "@/lib/dominio/stock/calcularNuevoSaldo";
import { ErrorDeDominio, mapearError } from "@/lib/errores/mapearError";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { EstadoRegistrarSalidaStock } from "@/services/stock/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

const CODIGO_POSTGRES_NO_DATA_FOUND = "P0002";
const CODIGO_STOCK_INSUFICIENTE = "NX004";

const esquemaRegistrarSalidaStock = z.object({
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
 * Registro de salida de stock (docs/ROLES.md §2, fila "movimientos_stock":
 * `C·L` para comerciante y empleado). Comparte la función RPC
 * `fn_registrar_movimiento_stock` con `registrarEntradaStock.ts`
 * (supabase/migrations/20260810120000_...): la validación de saldo
 * suficiente (`NX-PRD-004`) vive en la misma cláusula `WHERE` del `UPDATE`
 * dentro del RPC, no en una lectura previa desde esta Server Action — así
 * se evita la ventana de carrera entre "leer stock_actual", "decidir si
 * alcanza" y "descontar" que dos salidas concurrentes sobre el mismo
 * producto podrían explotar para dejar el stock en negativo.
 *
 * El RPC distingue por `SQLSTATE` el motivo de una falla del `UPDATE`
 * atómico: `NX004` (custom, definido en la función) para saldo
 * insuficiente → `NX-PRD-004`; `P0002` (`NO_DATA_FOUND`, reservado de
 * PL/pgSQL) para producto de otro tenant o inexistente → `NX-SYS-007`,
 * mismo criterio de `verificarPertenenciaTenant` (docs/ROLES.md §3.8) de no
 * distinguir "no existe" de "es de otro comercio".
 *
 * Antes de llamar al RPC se agrega un chequeo Fail-Fast con
 * `calcularNuevoSaldo` (src/lib/dominio/stock/): si el `stock_actual` leído
 * en ese momento ya alcanza para saber que la salida dejaría el saldo
 * negativo, se corta acá con `NX-PRD-004` sin ni siquiera intentar el RPC.
 * Es una optimización de UX, no la garantía real: bajo concurrencia ese
 * `stock_actual` puede quedar desactualizado entre esta lectura y el
 * `UPDATE`, así que el `WHERE stock_actual + v_delta >= 0` del RPC sigue
 * siendo la única fuente de verdad. Si el producto no aparece en esta
 * lectura (de otro tenant o inexistente), se omite el chequeo y se deja que
 * el RPC informe `NX-SYS-007` — no se duplica esa decisión acá.
 */
export async function registrarSalidaStock(
  _estadoPrevio: EstadoRegistrarSalidaStock,
  formData: FormData,
): Promise<EstadoRegistrarSalidaStock> {
  const resultado = esquemaRegistrarSalidaStock.safeParse({
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

  const { data: productoActual } = await supabase
    .from("productos")
    .select("stock_actual")
    .eq("producto_id", resultado.data.producto_id)
    .eq("cliente_id", solicitante.cliente_id)
    .is("eliminado_en", null)
    .maybeSingle<{ stock_actual: number }>();

  if (productoActual) {
    try {
      calcularNuevoSaldo(productoActual.stock_actual, resultado.data.cantidad, "salida");
    } catch (error) {
      if (error instanceof ErrorDeDominio) {
        return { error: mapearError(error).codigo, exito: false };
      }
      throw error;
    }
  }

  const { data: datoRpc, error: errorRpc } = await supabase.rpc("fn_registrar_movimiento_stock", {
    p_producto_id: resultado.data.producto_id,
    p_tipo: "salida",
    p_cantidad: resultado.data.cantidad,
  });
  const movimiento = datoRpc as FilaMovimientoStock | null;

  if (errorRpc || !movimiento) {
    const codigoPostgres = (errorRpc as ErrorPostgres | null)?.code;

    if (codigoPostgres === CODIGO_STOCK_INSUFICIENTE) {
      return { error: "NX-PRD-004", exito: false };
    }
    if (codigoPostgres === CODIGO_POSTGRES_NO_DATA_FOUND) {
      return { error: "NX-SYS-007", exito: false };
    }
    return { error: "NX-SYS-001", exito: false };
  }

  registrarDiff({
    clienteId: solicitante.cliente_id,
    usuarioId: solicitante.usuario_id,
    tablaAfectada: "movimientos_stock",
    registroId: movimiento.movimiento_id,
    campoModificado: "salida",
    valorAnterior: null,
    valorNuevo: String(movimiento.saldo_resultante),
  });

  return { error: null, exito: true };
}
