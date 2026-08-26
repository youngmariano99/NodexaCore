import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import {
  obtenerPedidosAsignadosARepartidor,
  obtenerRepartidorPorId,
} from "@/repositories/deliverysRepository";
import { VistaMovilDelivery } from "./VistaMovilDelivery";

export const metadata: Metadata = {
  title: "Hoja de Reparto Móvil — Nodexa Core",
};

interface DeliveryPageProps {
  params: Promise<{
    repartidorId: string;
  }>;
}

export default async function DeliveryPage({ params }: DeliveryPageProps) {
  const { repartidorId } = await params;
  const supabase = await crearClienteSupabaseServidor();

  const repartidor = await obtenerRepartidorPorId(supabase, repartidorId);
  if (!repartidor) {
    notFound();
  }

  const pedidos = await obtenerPedidosAsignadosARepartidor(supabase, repartidorId);

  return <VistaMovilDelivery repartidor={repartidor} pedidosIniciales={pedidos} />;
}
