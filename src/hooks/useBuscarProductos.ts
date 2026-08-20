import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { crearClienteSupabaseNavegador } from "@/lib/supabase/client";
import type { FilaProductoBusqueda } from "@/repositories/productosRepository";

interface RespuestaBusquedaProductos {
  productos: FilaProductoBusqueda[];
}

async function buscarProductos(termino: string): Promise<FilaProductoBusqueda[]> {
  const parametros = new URLSearchParams({ q: termino });
  const respuesta = await fetch(`/api/productos/buscar?${parametros.toString()}`);

  if (!respuesta.ok) {
    const cuerpo = (await respuesta.json().catch(() => null)) as { codigo?: string } | null;
    throw new Error(cuerpo?.codigo ?? "NX-SYS-001");
  }

  const datos = (await respuesta.json()) as RespuestaBusquedaProductos;
  return datos.productos;
}

/**
 * Búsqueda de productos por SKU/nombre para el buscador del Mostrador.
 * Habilita una suscripción en tiempo real a la tabla productos para actualizar
 * automáticamente el stock disponible en el buscador.
 */
export function useBuscarProductos(termino: string) {
  const terminoNormalizado = termino.trim();
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = crearClienteSupabaseNavegador();
    let channel: RealtimeChannel | null = null;

    const inicializarRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: perfil } = await supabase
        .from("usuarios")
        .select("cliente_id")
        .eq("auth_user_id", user.id)
        .single();

      if (!perfil?.cliente_id) return;

      channel = supabase
        .channel(`productos-buscar-realtime-${perfil.cliente_id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "productos",
            filter: `cliente_id=eq.${perfil.cliente_id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ["buscar-productos"] });
            queryClient.invalidateQueries({ queryKey: ["productos"] });
          }
        )
        .subscribe();
    };

    inicializarRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["buscar-productos", terminoNormalizado],
    queryFn: () => buscarProductos(terminoNormalizado),
    enabled: terminoNormalizado.length > 0,
  });
}
