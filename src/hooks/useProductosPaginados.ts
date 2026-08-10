import { keepPreviousData, useQuery } from "@tanstack/react-query";

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
 * app/(app)/productos/listado-productos.tsx. `placeholderData:
 * keepPreviousData` (TanStack Query v5) muestra la página anterior mientras
 * llega la siguiente en vez de un estado de carga en blanco, y junto con el
 * `staleTime` del `QueryProvider` evita refetch al volver a una página ya
 * cacheada dentro de la ventana de frescura (docs/SITEMAP.md criterio de
 * aceptación: "TanStack Query cachea los resultados evitando refetch
 * innecesario").
 */
export function useProductosPaginados(pagina: number) {
  return useQuery({
    queryKey: ["productos", pagina],
    queryFn: () => obtenerProductos(pagina),
    placeholderData: keepPreviousData,
  });
}
