import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { TableroComandasKanban, type PedidoKanban } from "./TableroComandasKanban";

export const metadata: Metadata = {
  title: "Tablero de Comandas & Pedidos en Tiempo Real — Nodexa Core",
};

export default async function ComandasPage() {
  const supabase = await crearClienteSupabaseServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("cliente_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!usuario || !usuario.cliente_id) {
    redirect("/login");
  }

  const { data: cliente } = await supabase
    .from("clientes")
    .select("nombre_comercio")
    .eq("cliente_id", usuario.cliente_id)
    .maybeSingle();

  if (!cliente) {
    notFound();
  }

  const { data: pedidosDb } = await supabase
    .from("pedidos_web")
    .select(`
      pedido_id,
      cliente_id,
      datos_cliente,
      metodo_pago,
      opcion_entrega,
      estado,
      subtotal,
      costo_envio,
      monto_ajuste,
      total,
      creado_en,
      pedido_items (
        item_id,
        nombre,
        cantidad,
        precio_unitario
      )
    `)
    .eq("cliente_id", usuario.cliente_id)
    .order("creado_en", { ascending: false });

  const pedidosIniciales: PedidoKanban[] = (pedidosDb ?? []).map((p) => {
    const rawDatos = (p.datos_cliente as Record<string, string>) || {};
    return {
      pedidoId: p.pedido_id,
      clienteId: p.cliente_id,
      datosCliente: {
        nombre: rawDatos.nombre || "Cliente Web",
        telefono: rawDatos.telefono || "",
        direccion: rawDatos.direccion || "",
        notas: rawDatos.notas || "",
      },
      metodoPago: p.metodo_pago || "efectivo",
      opcionEntrega: p.opcion_entrega === "retiro" ? "retiro" : "envio",
      estado: p.estado as PedidoKanban["estado"],
      subtotal: Number(p.subtotal) || 0,
      costoEnvio: Number(p.costo_envio) || 0,
      montoAjuste: Number(p.monto_ajuste) || 0,
      total: Number(p.total) || 0,
      creadoEn: p.creado_en,
      items: (p.pedido_items ?? []).map((item: { item_id: string; nombre: string; cantidad: number; precio_unitario: number }) => ({
        itemId: item.item_id,
        nombre: item.nombre,
        cantidad: item.cantidad,
        precioUnitario: Number(item.precio_unitario) || 0,
      })),
    };
  });

  return (
    <TableroComandasKanban
      pedidosIniciales={pedidosIniciales}
      nombreComercio={cliente.nombre_comercio}
    />
  );
}
