import { useQuery } from "@tanstack/react-query";
import type { ResultadoInsumosPaginados } from "@/repositories/insumosRepository";

export function useInsumosPaginados(pagina: number) {
  return useQuery<ResultadoInsumosPaginados>({
    queryKey: ["insumos", pagina],
    queryFn: async () => {
      const res = await fetch(`/api/insumos?page=${pagina}`);
      if (!res.ok) {
        throw new Error("Error al obtener los insumos");
      }
      return res.json();
    },
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 5, 
  });
}
