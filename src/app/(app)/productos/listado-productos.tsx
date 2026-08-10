"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { MensajeError } from "@/components/errores/MensajeError";
import { useProductosPaginados } from "@/hooks/useProductosPaginados";

const FORMATO_PRECIO = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

export function ListadoProductos() {
  const searchParams = useSearchParams();
  const paginaActual = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const { data, isPending, isError, isPlaceholderData } = useProductosPaginados(paginaActual);

  if (isPending) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-950 px-6 py-10 text-slate-400">
        Cargando productos...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-950 px-6">
        <MensajeError codigo="NX-SYS-001" className="max-w-md" />
      </div>
    );
  }

  const { productos, total, porPagina } = data;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  return (
    <div className="flex flex-1 flex-col bg-slate-950 px-6 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-50">Productos</h1>
          <p className="text-sm text-slate-400">
            {total} producto{total === 1 ? "" : "s"} activo{total === 1 ? "" : "s"} en tu catálogo.
          </p>
        </header>

        {productos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-slate-700 bg-slate-800 px-6 py-12 text-center">
            <p className="text-base text-slate-50">Todavía no cargaste ningún producto.</p>
            <p className="text-sm text-slate-400">
              Los productos que des de alta van a aparecer acá, ej. Yerba mate 1kg.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-700 bg-slate-800">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium">Precio</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((producto) => (
                  <tr
                    key={producto.producto_id}
                    className="border-b border-slate-700 last:border-b-0 hover:bg-slate-700"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{producto.sku}</td>
                    <td className="px-4 py-3 font-medium text-slate-50">{producto.nombre}</td>
                    <td className="px-4 py-3 text-slate-400">{producto.categoria ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-slate-50">{FORMATO_PRECIO.format(producto.precio)}</td>
                    <td className="px-4 py-3 font-mono text-slate-50">{producto.stock_actual}</td>
                    <td className="px-4 py-3">
                      {producto.publicado ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                          Publicado
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-700 px-2.5 py-1 text-xs text-slate-400">
                          Sin publicar
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPaginas > 1 ? (
          <nav
            className="flex items-center justify-between text-sm text-slate-400"
            aria-label="Paginación de productos"
          >
            <Link
              href={`/productos?page=${Math.max(1, paginaActual - 1)}`}
              aria-disabled={paginaActual <= 1}
              className={`flex min-h-11 items-center rounded-md border border-slate-700 px-4 transition-colors duration-150 ${
                paginaActual <= 1 ? "pointer-events-none opacity-40" : "hover:border-blue-500 hover:text-slate-50"
              }`}
            >
              ← Anterior
            </Link>
            <span className="font-mono">
              Página {paginaActual} de {totalPaginas}
              {isPlaceholderData ? " · actualizando..." : ""}
            </span>
            <Link
              href={`/productos?page=${Math.min(totalPaginas, paginaActual + 1)}`}
              aria-disabled={paginaActual >= totalPaginas || isPlaceholderData}
              className={`flex min-h-11 items-center rounded-md border border-slate-700 px-4 transition-colors duration-150 ${
                paginaActual >= totalPaginas || isPlaceholderData
                  ? "pointer-events-none opacity-40"
                  : "hover:border-blue-500 hover:text-slate-50"
              }`}
            >
              Siguiente →
            </Link>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
