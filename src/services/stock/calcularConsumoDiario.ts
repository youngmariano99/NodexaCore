"use server";

import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

export interface ResultadoConsumoDiario {
  productoId: string;
  consumoDiario: number;
  puntoPedido: number;
  diasDemora: number;
  stockMinimo: number;
  stockActual: number;
  dispararAlerta: boolean;
  prioridadUrgente: boolean;
}

interface FilaVentaItem {
  cantidad: number;
  ventas: {
    creado_en: string;
    cliente_id: string;
  };
}

interface FilaProducto {
  producto_id: string;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  proveedores: {
    dias_demora: number;
  } | null;
}

/**
 * Calcula el consumo diario promedio de los últimos 30 días para un producto,
 * ignorando los días sin ventas, e implementa el cálculo de punto de pedido y alertas.
 */
export async function calcularConsumoDiario(productoId: string): Promise<ResultadoConsumoDiario | null> {
  const supabase = await crearClienteSupabaseServidor();

  // 1. Obtener detalles del producto y del proveedor asociado
  const { data: producto, error: errorProducto } = await supabase
    .from("productos")
    .select(`
      producto_id,
      nombre,
      stock_actual,
      stock_minimo,
      proveedores:proveedor_id (
        dias_demora
      )
    `)
    .eq("producto_id", productoId)
    .is("eliminado_en", null)
    .single<FilaProducto>();

  if (errorProducto || !producto) {
    return null;
  }

  const stockMinimo = producto.stock_minimo;
  const stockActual = producto.stock_actual;
  const diasDemora = producto.proveedores?.dias_demora ?? 0;

  // 2. Obtener ventas del producto en los últimos 30 días
  const hace30Dias = new Date();
  hace30Dias.setDate(hace30Dias.getDate() - 30);
  const hace30DiasIso = hace30Dias.toISOString();

  const { data: items, error: errorItems } = await supabase
    .from("venta_items")
    .select(`
      cantidad,
      ventas:venta_id (
        creado_en,
        cliente_id
      )
    `)
    .eq("producto_id", productoId)
    .gte("ventas.creado_en", hace30DiasIso);

  if (errorItems || !items) {
    return null;
  }

  // 3. Procesar consumo diario (ignorar días sin ventas)
  let totalCantidad = 0;
  const fechasUnicas = new Set<string>();

  (items as unknown as FilaVentaItem[]).forEach((item) => {
    if (item.ventas?.creado_en) {
      totalCantidad += item.cantidad;
      // Truncar a la fecha y agregar al set
      const fecha = item.ventas.creado_en.split("T")[0];
      fechasUnicas.add(fecha);
    }
  });

  const diasConVentas = fechasUnicas.size;
  const consumoDiario = diasConVentas > 0 ? Number((totalCantidad / diasConVentas).toFixed(2)) : 0;

  // 4. Aplicar fórmula de reposición
  const puntoPedido = stockMinimo + (consumoDiario * diasDemora);
  const dispararAlerta = stockActual <= puntoPedido;
  const prioridadUrgente = stockActual <= stockMinimo;

  return {
    productoId,
    consumoDiario,
    puntoPedido,
    diasDemora,
    stockMinimo,
    stockActual,
    dispararAlerta,
    prioridadUrgente,
  };
}
