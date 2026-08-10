import type { Metadata } from "next";

import { FormularioAltaProducto } from "@/app/(app)/productos/nuevo/formulario-alta-producto";

export const metadata: Metadata = {
  title: "Nuevo producto — Nodexa Core",
};

/**
 * Alta manual de producto (docs/SITEMAP.md "/productos/nuevo"). La
 * autenticación y el rol se validan dentro del Server Action `crearProducto`
 * (y ya antes por el proxy global para `/productos/:path*`); esta página es
 * solo el formulario cliente que lo invoca.
 */
export default function NuevoProductoPage() {
  return (
    <div className="flex flex-1 flex-col items-center bg-slate-950 px-6 py-10 text-slate-50">
      <div className="flex w-full max-w-md flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-50">Nuevo producto</h1>
          <p className="text-sm text-slate-400">Cargá un producto nuevo a tu catálogo.</p>
        </header>

        <FormularioAltaProducto />
      </div>
    </div>
  );
}
