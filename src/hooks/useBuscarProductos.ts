import { useQuery } from "@tanstack/react-query";

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
 * Búsqueda de productos por SKU/nombre para el buscador del Mostrador,
 * consumido en `BuscadorProductos.tsx` con `termino` ya debounced
 * (`useDebouncedValue`). `enabled: termino.trim().length > 0` evita disparar
 * la consulta con el buscador vacío — no hay nada que listar y ahorra un
 * round-trip innecesario al abrir la pantalla.
 */
export function useBuscarProductos(termino: string) {
  const terminoNormalizado = termino.trim();

  return useQuery({
    queryKey: ["buscar-productos", terminoNormalizado],
    queryFn: () => buscarProductos(terminoNormalizado),
    enabled: terminoNormalizado.length > 0,
  });
}
