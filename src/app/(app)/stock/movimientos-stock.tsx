"use client";

import { PackageMinus, PackageOpen, PackagePlus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { MensajeError } from "@/components/errores/MensajeError";
import { useMovimientosStockPaginados } from "@/hooks/useMovimientosStockPaginados";
import type { FilaMovimientoStockListado } from "@/repositories/movimientosStockRepository";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

function EtiquetaTipoMovimiento({ tipo }: { tipo: FilaMovimientoStockListado["tipo"] }) {
  if (tipo === "entrada") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500">
        <PackagePlus className="h-3.5 w-3.5" aria-hidden="true" />
        Entrada
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-400">
      <PackageMinus className="h-3.5 w-3.5" aria-hidden="true" />
      Salida
    </span>
  );
}

/**
 * Vista de movimientos de stock (docs/BACKLOG.md "Vista de movimientos de
 * stock con TanStack Query"). El filtro opcional `?productoId=` permite
 * acotar la consulta a un único producto (calza con `idx_movstock_producto`
 * en el repositorio); sin filtro, lista todos los movimientos del tenant.
 * La paginación cambia de página vía `Link` a `?page=`, actualizando
 * `useSearchParams()` sin recarga completa — el fetch nuevo lo dispara
 * TanStack Query client-side (Paso 4 del checklist).
 */
export function MovimientosStock() {
  const searchParams = useSearchParams();
  const paginaActual = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const productoId = searchParams.get("productoId") ?? undefined;

  const { data, isPending, isError, isPlaceholderData } = useMovimientosStockPaginados(paginaActual, productoId);

  if (isPending) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-950 px-6 py-10 text-slate-400">
        Cargando movimientos de stock...
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

  const { movimientos, total, porPagina } = data;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const sufijoQuery = productoId ? `&productoId=${productoId}` : "";

  return (
    <div className="flex flex-1 flex-col bg-slate-950 px-6 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-50">Stock</h1>
          <p className="text-sm text-slate-400">
            {total} movimiento{total === 1 ? "" : "s"} de entrada y salida registrado{total === 1 ? "" : "s"} en tu
            comercio.
          </p>
        </header>

        {movimientos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-slate-700 bg-slate-800 px-6 py-12 text-center">
            <PackageOpen className="h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="text-base text-slate-50">Todavía no se registraron movimientos de stock.</p>
            <p className="text-sm text-slate-400">
              Las entradas (mercadería recibida) y salidas (mermas, roturas) que registres van a aparecer acá.
            </p>
            <Link
              href="/productos"
              className="mt-2 flex min-h-11 items-center rounded-md bg-blue-500 px-4 text-sm font-medium text-slate-50 transition-colors duration-150 hover:bg-blue-500/90"
            >
              Ver catálogo de productos
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-700 bg-slate-800">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium">Movimiento</th>
                  <th className="px-4 py-3 font-medium">Cantidad</th>
                  <th className="px-4 py-3 font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((movimiento) => (
                  <tr
                    key={movimiento.movimiento_id}
                    className="border-b border-slate-700 last:border-b-0 hover:bg-slate-700"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {FORMATO_FECHA.format(new Date(movimiento.creado_en))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-50">{movimiento.producto_nombre}</span>
                        <span className="font-mono text-xs text-slate-400">{movimiento.producto_sku}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <EtiquetaTipoMovimiento tipo={movimiento.tipo} />
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-50">
                      {movimiento.tipo === "entrada" ? "+" : "−"}
                      {movimiento.cantidad}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-50">{movimiento.saldo_resultante}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPaginas > 1 ? (
          <nav
            className="flex items-center justify-between text-sm text-slate-400"
            aria-label="Paginación de movimientos de stock"
          >
            <Link
              href={`/stock?page=${Math.max(1, paginaActual - 1)}${sufijoQuery}`}
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
              href={`/stock?page=${Math.min(totalPaginas, paginaActual + 1)}${sufijoQuery}`}
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
