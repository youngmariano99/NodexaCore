import { keepPreviousData, useQuery, type QueryClient } from "@tanstack/react-query";

import type { ResultadoMovimientosStockPaginados } from "@/repositories/movimientosStockRepository";

export const CLAVE_CONSULTA_MOVIMIENTOS_STOCK = "movimientos-stock";

async function obtenerMovimientosStock(
  pagina: number,
  productoId?: string,
): Promise<ResultadoMovimientosStockPaginados> {
  const parametros = new URLSearchParams({ pagina: String(pagina) });
  if (productoId) {
    parametros.set("productoId", productoId);
  }

  const respuesta = await fetch(`/api/stock?${parametros.toString()}`);

  if (!respuesta.ok) {
    const cuerpo = (await respuesta.json().catch(() => null)) as { codigo?: string } | null;
    throw new Error(cuerpo?.codigo ?? "NX-SYS-001");
  }

  return respuesta.json() as Promise<ResultadoMovimientosStockPaginados>;
}

/**
 * Hook de listado paginado de movimientos de stock, consumido en
 * app/(app)/stock/movimientos-stock.tsx. Mismo patrón que
 * `useProductosPaginados` (`placeholderData: keepPreviousData` para no
 * mostrar un estado de carga en blanco al cambiar de página).
 */
export function useMovimientosStockPaginados(pagina: number, productoId?: string) {
  return useQuery({
    queryKey: [CLAVE_CONSULTA_MOVIMIENTOS_STOCK, pagina, productoId ?? null],
    queryFn: () => obtenerMovimientosStock(pagina, productoId),
    placeholderData: keepPreviousData,
  });
}

/**
 * Punto de integración para que cualquier mutación de stock (`registrarEntradaStock`,
 * `registrarSalidaStock`) o de venta (descuento automático de stock, Sprint 6)
 * refresque esta vista sin recarga completa de página (docs/BACKLOG.md Paso 2:
 * "invalidación tras cada mutación de venta o stock"). Invalida por prefijo de
 * clave (`[CLAVE_CONSULTA_MOVIMIENTOS_STOCK]`), así que alcanza con este único
 * llamado sin importar la página o el filtro de producto que el usuario tenga
 * abiertos en ese momento — TanStack Query matchea todas las queries que
 * empiecen con esa clave.
 *
 * Ningún formulario de alta de movimiento existe todavía en el repo
 * (`registrarEntradaStock`/`registrarSalidaStock` son Server Actions sin
 * página propia — ver docs/PRUEBAS_MANUALES.md, sección "Pendiente de
 * pantalla"), así que hoy no hay ningún llamador real de este helper. Queda
 * listo para que la estación que construya esas pantallas lo invoque desde
 * el `useEffect`/callback que reacciona a `estado.exito` del `useActionState`
 * correspondiente, sin tener que reimplementar la invalidación.
 */
export function invalidarMovimientosStock(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: [CLAVE_CONSULTA_MOVIMIENTOS_STOCK] });
}
