"use server";

import { z } from "zod";

import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { EstadoConfirmarVenta } from "@/services/ventas/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

const CODIGO_POSTGRES_NO_DATA_FOUND = "P0002";
const CODIGO_VENTA_DUPLICADA = "NX002";
const CODIGO_STOCK_INSUFICIENTE = "NX001";

const esquemaItemVenta = z.object({
  productoId: z.string().uuid(),
  cantidad: z.coerce.number().int().positive(),
});

const esquemaConfirmarVenta = z.object({
  idempotencyKey: z.string().uuid("La clave de idempotencia es inválida."),
  clienteFinalId: z.string().uuid().nullable(),
  items: z.array(esquemaItemVenta).min(1, "La venta necesita al menos un producto."),
  total: z.coerce.number({ message: "El total de la venta es obligatorio." }),
});

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaVenta {
  venta_id: string;
  cliente_id: string;
  usuario_id: string;
  cliente_final_id: string | null;
  total: number;
  estado: string;
  idempotency_key: string;
}

interface ErrorPostgres {
  code?: string;
}

function parsearItems(valorCrudo: FormDataEntryValue | null): unknown {
  if (typeof valorCrudo !== "string") {
    return null;
  }
  try {
    return JSON.parse(valorCrudo);
  } catch {
    return null;
  }
}

/**
 * Confirmación de cobro con control de duplicados (docs/BACKLOG.md
 * "Server Action confirmarVenta con idempotency_key", docs/ROLES.md §2, fila
 * "ventas (mostrador)": `C·L` para comerciante y empleado).
 *
 * `idempotencyKey` la genera el cliente en el primer clic del botón de
 * cobro (`crypto.randomUUID()`, `ConfirmarCobro.tsx`) y viaja igual en
 * reintentos de la misma solicitud (doble clic, reintento de red): el
 * `UNIQUE (idempotency_key)` de `ventas` es la garantía real de no duplicar
 * el registro, no un chequeo previo en la app (que dejaría la misma
 * ventana de carrera que evitaría un `SELECT` antes del `INSERT`). El RPC
 * `fn_confirmar_venta` intenta el `INSERT` directo y traduce la violación de
 * unicidad (`SQLSTATE` custom `NX002`) a `NX-VTA-002` acá — nunca se duplica
 * la fila (Paso 3 / Criterio de Aceptación 2).
 *
 * `total` viaja en el payload solo como chequeo Fail-Fast (Criterio de
 * Aceptación 4): si es negativo, se corta acá con `NX-VTA-003` sin ni
 * siquiera llamar al RPC. El total que realmente se persiste nunca sale de
 * este campo — `fn_confirmar_venta` lo recalcula íntegramente contra el
 * `precio` real de `productos` del tenant (mismo criterio de zero-trust que
 * `POST /api/ventas/previsualizar`), así que un `total` manipulado en el
 * cliente no puede alterar lo que se guarda.
 *
 * `fn_confirmar_venta` (docs/BACKLOG.md "Función RPC transaccional de venta
 * con descuento de stock") también descuenta `productos.stock_actual` con
 * bloqueo optimista y registra el `movimientos_stock` de tipo `salida` por
 * cada ítem, dentro de la misma transacción que la `venta`. Si algún ítem no
 * tiene stock suficiente, el `SQLSTATE` custom `NX001` se traduce acá a
 * `NX-VTA-001` — la transacción completa ya se revirtió en el RPC.
 */
export async function confirmarVenta(
  _estadoPrevio: EstadoConfirmarVenta,
  formData: FormData,
): Promise<EstadoConfirmarVenta> {
  const clienteFinalIdCrudo = formData.get("cliente_final_id");

  const resultado = esquemaConfirmarVenta.safeParse({
    idempotencyKey: formData.get("idempotency_key"),
    clienteFinalId: clienteFinalIdCrudo ? clienteFinalIdCrudo : null,
    items: parsearItems(formData.get("items")),
    total: formData.get("total"),
  });

  if (!resultado.success) {
    return { error: "NX-SYS-006", exito: false, ventaId: null };
  }

  if (resultado.data.total < 0) {
    return { error: "NX-VTA-003", exito: false, ventaId: null };
  }

  const supabase = await crearClienteSupabaseServidor();

  const {
    data: { user: usuarioAutenticado },
  } = await supabase.auth.getUser();

  if (!usuarioAutenticado) {
    return { error: "NX-SYS-002", exito: false, ventaId: null };
  }

  const { data: solicitante, error: errorSolicitante } = await supabase
    .from("usuarios")
    .select("rol, cliente_id")
    .eq("auth_user_id", usuarioAutenticado.id)
    .is("eliminado_en", null)
    .single<FilaUsuarioSolicitante>();

  if (errorSolicitante || !solicitante) {
    return { error: "NX-SYS-001", exito: false, ventaId: null };
  }

  if ((solicitante.rol !== "comerciante" && solicitante.rol !== "empleado") || !solicitante.cliente_id) {
    return { error: "NX-SYS-003", exito: false, ventaId: null };
  }

  const { data: datoRpc, error: errorRpc } = await supabase.rpc("fn_confirmar_venta", {
    p_idempotency_key: resultado.data.idempotencyKey,
    p_cliente_final_id: resultado.data.clienteFinalId,
    p_items: resultado.data.items.map((item) => ({ producto_id: item.productoId, cantidad: item.cantidad })),
  });
  const venta = datoRpc as FilaVenta | null;

  if (errorRpc || !venta) {
    const codigoPostgres = (errorRpc as ErrorPostgres | null)?.code;

    if (codigoPostgres === CODIGO_VENTA_DUPLICADA) {
      return { error: "NX-VTA-002", exito: false, ventaId: null };
    }
    if (codigoPostgres === CODIGO_STOCK_INSUFICIENTE) {
      return { error: "NX-VTA-001", exito: false, ventaId: null };
    }
    if (codigoPostgres === CODIGO_POSTGRES_NO_DATA_FOUND) {
      return { error: "NX-SYS-007", exito: false, ventaId: null };
    }
    return { error: "NX-VTA-005", exito: false, ventaId: null };
  }

  return { error: null, exito: true, ventaId: venta.venta_id };
}
