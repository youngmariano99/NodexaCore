import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { crearClienteSupabaseNavegador } from "@/lib/supabase/client";
import type { ResultadoProductosPaginados } from "@/repositories/productosRepository";

async function obtenerProductos(pagina: number): Promise<ResultadoProductosPaginados> {
  const respuesta = await fetch(`/api/productos?pagina=${pagina}`);

  if (!respuesta.ok) {
    const cuerpo = (await respuesta.json().catch(() => null)) as { codigo?: string } | null;
    throw new Error(cuerpo?.codigo ?? "NX-SYS-001");
  }

  return respuesta.json() as Promise<ResultadoProductosPaginados>;
}

/**
 * Hook de listado paginado de productos consumido en
 * app/(app)/productos/listado-productos.tsx. Habilita una suscripción en tiempo
 * real a la tabla productos para actualizar automáticamente el stock y catálogo.
 */
export function useProductosPaginados(pagina: number) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = crearClienteSupabaseNavegador();
    let channel: RealtimeChannel | null = null;
    let isCancelled = false;

    const inicializarRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (isCancelled || !user) return;

      const { data: perfil } = await supabase
        .from("usuarios")
        .select("cliente_id")
        .eq("auth_user_id", user.id)
        .single();

      if (isCancelled || !perfil?.cliente_id) return;

      const channelName = `productos-paginados-realtime-${perfil.cliente_id}`;

      // Limpiar canal existente si ya existiera en cache del cliente
      const existingChannel = supabase.getChannels().find((c) => c.topic === `realtime:${channelName}` || c.topic === channelName);
      if (existingChannel) {
        await supabase.removeChannel(existingChannel);
      }

      if (isCancelled) return;

      channel = supabase.channel(channelName);
      
      channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "productos",
          filter: `cliente_id=eq.${perfil.cliente_id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["productos"] });
        }
      );

      if (isCancelled) return;
      channel.subscribe();
    };

    inicializarRealtime();

    return () => {
      isCancelled = true;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["productos", pagina],
    queryFn: () => obtenerProductos(pagina),
    placeholderData: keepPreviousData,
  });
}
