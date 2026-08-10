import type { Metadata } from "next";
import { Suspense } from "react";

import { MovimientosStock } from "@/app/(app)/stock/movimientos-stock";

export const metadata: Metadata = {
  title: "Stock — Nodexa Core",
};

/**
 * `MovimientosStock` usa `useSearchParams()` (docs Next.js App Router: debe
 * envolverse en `Suspense` para no forzar toda la ruta a client-side
 * rendering sin límite). El fetch real ocurre client-side vía TanStack Query
 * contra `/api/stock` (route.ts), autenticado y autorizado ahí — mismo
 * patrón que app/(app)/productos/page.tsx.
 */
export default function StockPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center bg-slate-950 px-6 py-10 text-slate-400">
          Cargando movimientos de stock...
        </div>
      }
    >
      <MovimientosStock />
    </Suspense>
  );
}
