"use client";

import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import type { Dispatch } from "react";

import type { AccionCarrito, ItemCarrito } from "@/lib/dominio/ventas/carritoReducer";

const FORMATO_PRECIO = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

interface CarritoVentaProps {
  items: ItemCarrito[];
  dispatch: Dispatch<AccionCarrito>;
}

/**
 * Listado editable del carrito en curso (docs/BACKLOG.md Paso 3: subcomponente
 * propio, separado de `BuscadorProductos.tsx` para no superar el límite de
 * líneas del archivo). Los controles de +/- y quitar cumplen el área táctil
 * mínima de 44x44px (`min-h-11 min-w-11`, docs/DESIGN.md `min-touch-target`)
 * — Paso 4 del checklist.
 */
export function CarritoVenta({ items, dispatch }: CarritoVentaProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-slate-700 bg-slate-800 px-6 py-10 text-center">
        <ShoppingCart className="h-6 w-6 text-slate-400" aria-hidden="true" />
        <p className="text-sm text-slate-50">El carrito está vacío.</p>
        <p className="text-xs text-slate-400">Buscá un producto por SKU o nombre para empezar la venta.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const enElTope = item.cantidad >= item.stockDisponible;

        return (
          <li
            key={item.productoId}
            className="flex items-center justify-between gap-3 rounded-md border border-slate-700 bg-slate-800 px-4 py-3"
          >
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-slate-50">{item.nombre}</span>
              <span className="font-mono text-xs text-slate-400">{item.sku}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => dispatch({ tipo: "DECREMENTAR_CANTIDAD", productoId: item.productoId })}
                aria-label={`Quitar una unidad de ${item.nombre}`}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-slate-700 text-slate-50 transition-colors duration-150 hover:border-blue-500"
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>

              <span className="w-8 text-center font-mono text-sm text-slate-50">{item.cantidad}</span>

              <button
                type="button"
                onClick={() => dispatch({ tipo: "INCREMENTAR_CANTIDAD", productoId: item.productoId })}
                disabled={enElTope}
                aria-label={`Agregar una unidad más de ${item.nombre}`}
                className={`flex min-h-11 min-w-11 items-center justify-center rounded-md border transition-colors duration-150 ${
                  enElTope
                    ? "cursor-not-allowed border-slate-700 text-slate-700"
                    : "border-slate-700 text-slate-50 hover:border-blue-500"
                }`}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <span className="w-24 shrink-0 text-right font-mono text-sm text-slate-50">
              {FORMATO_PRECIO.format(item.precio * item.cantidad)}
            </span>

            <button
              type="button"
              onClick={() => dispatch({ tipo: "QUITAR_PRODUCTO", productoId: item.productoId })}
              aria-label={`Quitar ${item.nombre} del carrito`}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-400 transition-colors duration-150 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
