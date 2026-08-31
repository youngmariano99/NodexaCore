import { useQuery } from "@tanstack/react-query";
import { crearClienteSupabaseNavegador } from "@/lib/supabase/client";
import {
  type ReglaMetodoPago,
  METODOS_PAGO_POR_DEFECTO,
} from "@/lib/dominio/ventas/calcularTotalVenta";

async function obtenerMetodosPagoComercio(): Promise<ReglaMetodoPago[]> {
  const supabase = crearClienteSupabaseNavegador();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return METODOS_PAGO_POR_DEFECTO;
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("cliente_id")
    .eq("auth_user_id", user.id)
    .is("eliminado_en", null)
    .maybeSingle();

  if (!usuario || !usuario.cliente_id) {
    return METODOS_PAGO_POR_DEFECTO;
  }

  const { data: cliente, error } = await supabase
    .from("clientes")
    .select("configuracion_metodos_pago")
    .eq("cliente_id", usuario.cliente_id)
    .maybeSingle();

  if (error || !cliente || !cliente.configuracion_metodos_pago) {
    return METODOS_PAGO_POR_DEFECTO;
  }

  const metodos = cliente.configuracion_metodos_pago as ReglaMetodoPago[];
  if (Array.isArray(metodos) && metodos.length > 0) {
    return metodos;
  }

  return METODOS_PAGO_POR_DEFECTO;
}

export function useMetodosPagoComercio() {
  return useQuery({
    queryKey: ["metodos-pago-comercio"],
    queryFn: obtenerMetodosPagoComercio,
    staleTime: 1000 * 60 * 5, // 5 minutos de caché
  });
}
