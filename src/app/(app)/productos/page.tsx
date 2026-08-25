import type { Metadata } from "next";
import { Suspense } from "react";

import { ListadoProductos } from "@/app/(app)/productos/listado-productos";

export const metadata: Metadata = {
  title: "Productos — Nodexa Core",
};

/**
 * `ListadoProductos` usa `useSearchParams()` (docs Next.js App Router: debe
 * envolverse en `Suspense` para no forzar toda la ruta a client-side
 * rendering sin límite). El fetch real ocurre client-side vía TanStack
 * Query contra `/api/productos` (route.ts), autenticado y autorizado ahí.
 */
export default function ProductosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center bg-[#090B0B] px-6 py-10 text-slate-400">
          Cargando productos...
        </div>
      }
    >
      <ListadoProductos />
    </Suspense>
  );
}
