import type { Metadata } from "next";

import { BuscadorProductos } from "@/app/(app)/mostrador/BuscadorProductos";

export const metadata: Metadata = {
  title: "Mostrador — Nodexa Core",
};

/**
 * `BuscadorProductos` no usa `useSearchParams()` (a diferencia de
 * `/productos` y `/stock`): el Mostrador es una pantalla operativa de un
 * único momento, no algo que se navegue por URL, así que no hace falta
 * envolverla en `Suspense`.
 */
export default function MostradorPage() {
  return <BuscadorProductos />;
}
