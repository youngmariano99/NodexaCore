"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

const TIEMPO_DE_FRESCURA_MS = 30_000;

/**
 * Provider de TanStack Query para el grupo (app) (docs/SITEMAP.md
 * "/productos → Listado paginado de productos (Core)"). Cachea en cliente
 * las consultas paginadas: navegar entre páginas ya visitadas dentro de la
 * ventana de frescura (`staleTime`) no dispara un nuevo fetch.
 * `useState(() => new QueryClient())` en vez de una instancia a nivel de
 * módulo: evita compartir caché entre requests/usuarios distintos si algún
 * día este árbol se renderiza también en el servidor.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: TIEMPO_DE_FRESCURA_MS,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
