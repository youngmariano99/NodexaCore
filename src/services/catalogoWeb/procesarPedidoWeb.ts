"use server";

import { z } from "zod";
import { crearClienteSupabaseAdmin } from "@/lib/supabase/server";

export interface EstadoProcesarPedidoWeb {
  exito: boolean;
  error: string | null;
  pedidoId?: string;
}

const esquemaItemPedido = z.object({
  productoId: z.string().uuid("El ID del producto debe ser válido"),
  nombre: z.string().min(1, "El nombre del producto es requerido"),
  cantidad: z.number().int().positive("La cantidad debe ser mayor a cero"),
  precioUnitario: z.number().nonnegative("El precio unitario no puede ser negativo"),
});

const esquemaPedidoWeb = z.object({
  clienteId: z.string().uuid("Identificador de comercio inválido"),
  datosCliente: z.object({
    nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
    telefono: z.string().min(5, "El teléfono es requerido").max(50),
    direccion: z.string().max(255).optional(),
    notas: z.string().max(500).optional(),
  }),
  metodoPago: z.enum(["efectivo", "transferencia", "tarjeta"]),
  opcionEntrega: z.enum(["envio", "retiro"]),
  subtotal: z.number().nonnegative("El subtotal no puede ser negativo"),
  costoEnvio: z.number().nonnegative("El costo de envío no puede ser negativo").default(0),
  items: z.array(esquemaItemPedido).min(1, "El pedido debe tener al menos un ítem"),
});

export type InputProcesarPedidoWeb = z.infer<typeof esquemaPedidoWeb>;

export async function procesarPedidoWeb(
  input: InputProcesarPedidoWeb
): Promise<EstadoProcesarPedidoWeb> {
  const validacion = esquemaPedidoWeb.safeParse(input);

  if (!validacion.success) {
    return { exito: false, error: "NX-SYS-006" };
  }

  const payload = validacion.data;
  const supabase = crearClienteSupabaseAdmin();
  const totalCalculado = payload.subtotal + payload.costoEnvio;

  try {
    // Insertamos la orden maestra en el Kanban de comandas (pedidos_web)
    const { data: pedido, error: errorPedido } = await supabase
      .from("pedidos_web")
      .insert({
        cliente_id: payload.clienteId,
        datos_cliente: payload.datosCliente,
        metodo_pago: payload.metodoPago,
        opcion_entrega: payload.opcionEntrega,
        estado: "pendiente",
        subtotal: payload.subtotal,
        costo_envio: payload.costoEnvio,
        monto_ajuste: 0,
        total: totalCalculado,
      })
      .select("pedido_id")
      .single();

    if (errorPedido || !pedido) {
      console.error("[procesarPedidoWeb] Error al insertar pedido:", errorPedido);
      return { exito: false, error: "NX-SYS-001" };
    }

    // Insertamos las líneas del pedido
    const itemsParaInsertar = payload.items.map((item) => ({
      pedido_id: pedido.pedido_id,
      producto_id: item.productoId,
      nombre: item.nombre,
      cantidad: item.cantidad,
      precio_unitario: item.precioUnitario,
      subtotal: Number((item.cantidad * item.precioUnitario).toFixed(2)),
    }));

    const { error: errorItems } = await supabase
      .from("pedido_items")
      .insert(itemsParaInsertar);

    if (errorItems) {
      console.error("[procesarPedidoWeb] Error al insertar items:", errorItems);
      // Compensación transaccional: Eliminamos el pedido cabecera huérfano
      await supabase.from("pedidos_web").delete().eq("pedido_id", pedido.pedido_id);
      return { exito: false, error: "NX-SYS-001" };
    }

    return { exito: true, error: null, pedidoId: pedido.pedido_id };
  } catch (err) {
    console.error("[procesarPedidoWeb] Error excepcional:", err);
    return { exito: false, error: "NX-SYS-001" };
  }
}
