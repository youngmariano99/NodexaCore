"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { FiltroInteligente } from "./FiltroInteligente";

export interface ProductoCatalogo {
  producto_id: string;
  nombre: string;
  descripcion?: string | null;
  precio_venta: number;
  url_imagen?: string | null;
  categoria?: string | null;
}

interface GrillaProductosProps {
  productos: ProductoCatalogo[];
  mostrarPrecios: boolean;
  colorPrimario: string;
}

export function GrillaProductos({
  productos,
  mostrarPrecios,
  colorPrimario,
}: GrillaProductosProps) {
  const [terminoBusqueda, setTerminoBusqueda] = useState("");

  const productosFiltrados = useMemo(() => {
    if (!terminoBusqueda.trim()) return productos;
    
    const terminoLower = terminoBusqueda.toLowerCase();
    return productos.filter(
      (prod) =>
        prod.nombre.toLowerCase().includes(terminoLower) ||
        (prod.descripcion && prod.descripcion.toLowerCase().includes(terminoLower)) ||
        (prod.categoria && prod.categoria.toLowerCase().includes(terminoLower))
    );
  }, [productos, terminoBusqueda]);

  const formatearPrecio = (precio: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 2,
    }).format(precio);
  };

  return (
    <section 
      className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
      style={{ "--color-primario": colorPrimario } as React.CSSProperties}
    >
      <FiltroInteligente
        terminoBusqueda={terminoBusqueda}
        alCambiarBusqueda={setTerminoBusqueda}
        colorPrimario={colorPrimario}
      />

      {productosFiltrados.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-8 text-center">
          <p className="text-lg font-medium text-slate-300">No encontramos productos</p>
          <p className="mt-1 text-sm text-slate-500">
            Intentá buscar con otras palabras clave.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {productosFiltrados.map((producto) => (
            <article
              key={producto.producto_id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#111615] transition-all hover:border-slate-700 hover:shadow-lg hover:shadow-black/50"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-slate-900">
                {producto.url_imagen ? (
                  <Image
                    src={producto.url_imagen}
                    alt={producto.nombre}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-900/50">
                    <span className="text-xs font-medium uppercase tracking-wider text-slate-600">
                      Sin imagen
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col p-5">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h3 className="font-semibold leading-tight text-slate-100 line-clamp-2">
                    {producto.nombre}
                  </h3>
                  {mostrarPrecios && (
                    <span className="shrink-0 font-bold text-white">
                      {formatearPrecio(producto.precio_venta)}
                    </span>
                  )}
                </div>

                {producto.descripcion && (
                  <p className="mt-1 text-sm text-slate-400 line-clamp-2">
                    {producto.descripcion}
                  </p>
                )}

                {/* Si mostrar_precios es false, se oculta el botón de carrito según los criterios de aceptación */}
                {mostrarPrecios && (
                  <div className="mt-auto pt-4">
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-slate-950 transition-all hover:opacity-90"
                      style={{ backgroundColor: "var(--color-primario)" }}
                      onClick={() => console.log("Agregar al carrito:", producto.producto_id)}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Agregar al Carrito
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
