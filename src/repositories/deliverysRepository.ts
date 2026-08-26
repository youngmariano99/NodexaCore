import type { SupabaseClient } from "@supabase/supabase-js";

export interface RepartidorEntity {
  repartidor_id: string;
  cliente_id: string;
  nombre: string;
  telefono: string;
  pin_acceso: string;
  activo: boolean;
  creado_en: string;
  eliminado_en?: string | null;
}

export interface PedidoDeliveryEntity {
  pedido_id: string;
  cliente_id: string;
  datos_cliente: {
    nombre: string;
    telefono: string;
    direccion?: string;
    notas?: string;
  };
  metodo_pago: string;
  opcion_entrega: string;
  estado: string;
  subtotal: number;
  costo_envio: number;
  monto_ajuste: number;
  total: number;
  repartidor_id?: string | null;
  creado_en: string;
}

export async function contarRepartidoresActivos(
  supabase: SupabaseClient,
  clienteId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("repartidores")
    .select("repartidor_id", { count: "exact", head: true })
    .eq("cliente_id", clienteId)
    .eq("activo", true)
    .is("eliminado_en", null);

  if (error) {
    throw new Error(`NX-SYS-001: ${error.message}`);
  }

  return count ?? 0;
}

export async function obtenerRepartidoresActivos(
  supabase: SupabaseClient,
  clienteId: string
): Promise<RepartidorEntity[]> {
  const { data, error } = await supabase
    .from("repartidores")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error(`NX-SYS-001: ${error.message}`);
  }

  return data ?? [];
}

export async function crearRepartidor(
  supabase: SupabaseClient,
  clienteId: string,
  datos: { nombre: string; telefono: string; pin_acceso: string }
): Promise<RepartidorEntity> {
  const { data, error } = await supabase
    .from("repartidores")
    .insert({
      cliente_id: clienteId,
      nombre: datos.nombre,
      telefono: datos.telefono,
      pin_acceso: datos.pin_acceso,
      activo: true,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`NX-SYS-001: ${error.message}`);
  }

  return data;
}

export async function obtenerRepartidorPorId(
  supabase: SupabaseClient,
  repartidorId: string
): Promise<RepartidorEntity | null> {
  const { data, error } = await supabase
    .from("repartidores")
    .select("*")
    .eq("repartidor_id", repartidorId)
    .eq("activo", true)
    .is("eliminado_en", null)
    .maybeSingle();

  if (error) {
    throw new Error(`NX-SYS-001: ${error.message}`);
  }

  return data;
}

export async function obtenerPedidosAsignadosARepartidor(
  supabase: SupabaseClient,
  repartidorId: string
): Promise<PedidoDeliveryEntity[]> {
  const { data, error } = await supabase
    .from("pedidos_web")
    .select("*")
    .eq("repartidor_id", repartidorId)
    .in("estado", ["en_preparacion", "despachado"])
    .order("creado_en", { ascending: false });

  if (error) {
    throw new Error(`NX-SYS-001: ${error.message}`);
  }

  return data ?? [];
}

export async function asignarRepartidorAPedido(
  supabase: SupabaseClient,
  pedidoId: string,
  repartidorId: string | null
): Promise<void> {
  const { error } = await supabase
    .from("pedidos_web")
    .update({ repartidor_id: repartidorId })
    .eq("pedido_id", pedidoId);

  if (error) {
    throw new Error(`NX-SYS-001: ${error.message}`);
  }
}

export async function actualizarEstadoPedidoDelivery(
  supabase: SupabaseClient,
  pedidoId: string,
  nuevoEstado: string
): Promise<void> {
  const { error } = await supabase
    .from("pedidos_web")
    .update({ estado: nuevoEstado })
    .eq("pedido_id", pedidoId);

  if (error) {
    throw new Error(`NX-SYS-001: ${error.message}`);
  }
}
