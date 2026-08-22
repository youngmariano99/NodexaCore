import { useQuery } from "@tanstack/react-query";
import { crearClienteSupabaseNavegador } from "@/lib/supabase/client";

export interface ClienteFinalBusqueda {
  cliente_final_id: string;
  nombre: string;
  telefono: string | null;
  saldo_deudor: number;
}

async function buscarClientesFinales(termino: string): Promise<ClienteFinalBusqueda[]> {
  const supabase = crearClienteSupabaseNavegador();
  
  let query = supabase
    .from("clientes_finales")
    .select("cliente_final_id, nombre, telefono, saldo_deudor")
    .is("eliminado_en", null)
    .order("nombre", { ascending: true })
    .limit(10);

  if (termino.length > 0) {
    query = query.ilike("nombre", `%${termino}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data as ClienteFinalBusqueda[];
}

export function useBuscarClientesFinales(termino: string) {
  const terminoNormalizado = termino.trim();
  return useQuery({
    queryKey: ["buscar-clientes-finales", terminoNormalizado],
    queryFn: () => buscarClientesFinales(terminoNormalizado),
  });
}
