import type { Metadata } from "next";
import { Suspense } from "react";

import { ListadoInsumos } from "./ListadoInsumos";

export const metadata: Metadata = {
  title: "Insumos | Nodexa Core",
};

export default function InsumosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center bg-[#090B0B] px-6 py-10 text-slate-400">
          Cargando insumos...
        </div>
      }
    >
      <ListadoInsumos />
    </Suspense>
  );
}
