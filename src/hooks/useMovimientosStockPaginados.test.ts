import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CLAVE_CONSULTA_MOVIMIENTOS_STOCK, invalidarMovimientosStock } from "./useMovimientosStockPaginados";

const respuestaFetchOk = (cuerpo: unknown) =>
  ({ ok: true, json: async () => cuerpo }) as Response;

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("invalidarMovimientosStock", () => {
  it("invalida todas las queries de movimientos de stock sin importar la página o el filtro de producto abiertos", async () => {
    const queryClient = new QueryClient();
    const datosPagina1 = { movimientos: [], total: 0, pagina: 1, porPagina: 25 };
    const datosPagina2ConFiltro = { movimientos: [], total: 0, pagina: 2, porPagina: 25 };

    vi.mocked(fetch)
      .mockResolvedValueOnce(respuestaFetchOk(datosPagina1))
      .mockResolvedValueOnce(respuestaFetchOk(datosPagina2ConFiltro));

    await queryClient.fetchQuery({
      queryKey: [CLAVE_CONSULTA_MOVIMIENTOS_STOCK, 1, null],
      queryFn: () => fetch("/api/stock?pagina=1").then((r) => r.json()),
    });
    await queryClient.fetchQuery({
      queryKey: [CLAVE_CONSULTA_MOVIMIENTOS_STOCK, 2, "producto-1"],
      queryFn: () => fetch("/api/stock?pagina=2&productoId=producto-1").then((r) => r.json()),
    });

    expect(queryClient.getQueryState([CLAVE_CONSULTA_MOVIMIENTOS_STOCK, 1, null])?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState([CLAVE_CONSULTA_MOVIMIENTOS_STOCK, 2, "producto-1"])?.isInvalidated).toBe(false);

    await invalidarMovimientosStock(queryClient);

    expect(queryClient.getQueryState([CLAVE_CONSULTA_MOVIMIENTOS_STOCK, 1, null])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState([CLAVE_CONSULTA_MOVIMIENTOS_STOCK, 2, "producto-1"])?.isInvalidated).toBe(true);
  });

  it("no afecta queries de otras claves (ej. productos)", async () => {
    const queryClient = new QueryClient();
    vi.mocked(fetch).mockResolvedValueOnce(respuestaFetchOk({ productos: [], total: 0, pagina: 1, porPagina: 25 }));

    await queryClient.fetchQuery({
      queryKey: ["productos", 1],
      queryFn: () => fetch("/api/productos?pagina=1").then((r) => r.json()),
    });

    await invalidarMovimientosStock(queryClient);

    expect(queryClient.getQueryState(["productos", 1])?.isInvalidated).toBe(false);
  });
});
