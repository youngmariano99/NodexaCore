"use client";

import { Plus, Search } from "lucide-react";
import { useReducer, useState } from "react";

import { MensajeError } from "@/components/errores/MensajeError";
import { useBuscarProductos } from "@/hooks/useBuscarProductos";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ESTADO_CARRITO_INICIAL, reducirCarrito } from "@/lib/dominio/ventas/carritoReducer";
import type { FilaProductoBusqueda } from "@/repositories/productosRepository";

import { CarritoVenta } from "@/app/(app)/mostrador/CarritoVenta";
import { ResumenTotal } from "@/app/(app)/mostrador/ResumenTotal";

const FORMATO_PRECIO = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
const DEMORA_DEBOUNCE_MS = 300;

/**
 * Panel de búsqueda + carrito del Mostrador (docs/BACKLOG.md "Componente de
 * búsqueda y carrito en Panel de Ventas"). El carrito vive acá como
 * `useReducer` en estado puramente local (Paso 2): no hay ningún
 * `localStorage`/`sessionStorage` de por medio, así que se pierde a
 * propósito al recargar la página — todavía no existe un flujo de "venta en
 * curso" persistente, eso es alcance de una historia futura (confirmación
 * de cobro, Sprint 6).
 *
 * El término de búsqueda se debouncea (`useDebouncedValue`, 300ms) antes de
 * llegar a `useBuscarProductos`: escribir "yerba" dispara como máximo una
 * consulta a `/api/productos/buscar`, no una por tecla (Criterio de
 * Aceptación 1).
 */
export function BuscadorProductos() {
  const [terminoBusqueda, setTerminoBusqueda] = useState("");
  const [carrito, dispatch] = useReducer(reducirCarrito, ESTADO_CARRITO_INICIAL);

  const terminoDebounced = useDebouncedValue(terminoBusqueda, DEMORA_DEBOUNCE_MS);
  const { data: resultados, isFetching, isError } = useBuscarProductos(terminoDebounced);

  function agregarAlCarrito(producto: FilaProductoBusqueda) {
    dispatch({
      tipo: "AGREGAR_PRODUCTO",
      producto: {
        productoId: producto.producto_id,
        sku: producto.sku,
        nombre: producto.nombre,
        precio: producto.precio,
        stockDisponible: producto.stock_actual,
      },
    });
  }

  const mostrandoResultados = terminoDebounced.trim().length > 0;

  return (
    <div className="flex flex-1 flex-col bg-slate-950 px-6 py-10 text-slate-50">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="flex flex-col gap-4">
          <header className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-slate-50">Mostrador</h1>
            <p className="text-sm text-slate-400">Buscá un producto por SKU o nombre para agregarlo a la venta.</p>
          </header>

          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={terminoBusqueda}
              onChange={(evento) => setTerminoBusqueda(evento.target.value)}
              placeholder="ej. yerba, DP-00001"
              aria-label="Buscar producto por SKU o nombre"
              className="min-h-11 w-full rounded-md border border-slate-700 bg-slate-800 py-2 pl-10 pr-3 text-sm text-slate-50 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {isError ? <MensajeError codigo="NX-SYS-001" /> : null}

          {mostrandoResultados ? (
            <ul className="flex flex-col gap-2" aria-live="polite">
              {isFetching && !resultados ? (
                <li className="rounded-md border border-slate-700 bg-slate-800 px-4 py-6 text-center text-sm text-slate-400">
                  Buscando...
                </li>
              ) : null}

              {resultados && resultados.length === 0 ? (
                <li className="rounded-md border border-dashed border-slate-700 bg-slate-800 px-4 py-6 text-center text-sm text-slate-400">
                  No encontramos productos para &ldquo;{terminoDebounced}&rdquo;.
                </li>
              ) : null}

              {resultados?.map((producto) => {
                const sinStock = producto.stock_actual <= 0;

                return (
                  <li
                    key={producto.producto_id}
                    className="flex items-center justify-between gap-3 rounded-md border border-slate-700 bg-slate-800 px-4 py-3"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium text-slate-50">{producto.nombre}</span>
                      <span className="font-mono text-xs text-slate-400">
                        {producto.sku} · Stock: <span className="font-mono">{producto.stock_actual}</span>
                      </span>
                    </div>

                    <span className="w-24 shrink-0 text-right font-mono text-sm text-slate-50">
                      {FORMATO_PRECIO.format(producto.precio)}
                    </span>

                    <button
                      type="button"
                      onClick={() => agregarAlCarrito(producto)}
                      disabled={sinStock}
                      aria-label={`Agregar ${producto.nombre} a la venta`}
                      className={`flex min-h-11 min-w-11 items-center justify-center rounded-md border transition-colors duration-150 ${
                        sinStock
                          ? "cursor-not-allowed border-slate-700 text-slate-700"
                          : "border-blue-500 text-blue-500 hover:bg-blue-500/10"
                      }`}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed border-slate-700 bg-slate-800 px-4 py-6 text-center text-sm text-slate-400">
              Empezá a escribir para buscar productos.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-slate-400">Venta en curso</h2>
          <CarritoVenta items={carrito} dispatch={dispatch} />
          <ResumenTotal items={carrito} />
        </section>
      </div>
    </div>
  );
}
