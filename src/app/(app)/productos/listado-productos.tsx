"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Trash2, Pencil, Loader2, Plus } from "lucide-react";

import { MensajeError } from "@/components/errores/MensajeError";
import { useProductosPaginados } from "@/hooks/useProductosPaginados";
import { eliminarProducto } from "@/services/productos/eliminarProducto";
import { ESTADO_ELIMINAR_PRODUCTO_INICIAL } from "@/services/productos/tipos";
import { obtenerMensajeError } from "@/lib/errores/catalogo";

const FORMATO_PRECIO = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

interface Producto {
  producto_id: string;
  sku: string;
  nombre: string;
  categoria: string | null;
  precio: number;
  stock_actual: number;
  publicado: boolean;
}

export function ListadoProductos() {
  const searchParams = useSearchParams();
  const paginaActual = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const queryClient = useQueryClient();

  const { data, isPending, isError, isPlaceholderData } = useProductosPaginados(paginaActual);
  const [productoAEliminar, setProductoAEliminar] = useState<Producto | null>(null);
  const [isPendingDelete, startTransitionDelete] = useTransition();
  const [errorDelete, setErrorDelete] = useState<string | null>(null);

  if (isPending) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#090B0B] px-6 py-10 text-[#A6AEAA]">
        Cargando productos...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#090B0B] px-6">
        <MensajeError codigo="NX-SYS-001" className="max-w-md" />
      </div>
    );
  }

  const { productos, total, porPagina } = data;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  const confirmarBaja = () => {
    if (!productoAEliminar) return;

    setErrorDelete(null);
    startTransitionDelete(async () => {
      const resultado = await eliminarProducto(
        productoAEliminar.producto_id,
        ESTADO_ELIMINAR_PRODUCTO_INICIAL,
        new FormData()
      );

      if (resultado.exito) {
        await queryClient.invalidateQueries({ queryKey: ["productos"] });
        setProductoAEliminar(null);
      } else {
        setErrorDelete(resultado.error);
      }
    });
  };

  return (
    <div className="flex flex-1 flex-col bg-[#090B0B] px-6 py-10 text-[#F3F5F4]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-row justify-between items-center gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-[#F3F5F4]">Productos</h1>
            <p className="text-sm text-[#A6AEAA]">
              {total} producto{total === 1 ? "" : "s"} activo{total === 1 ? "" : "s"} en tu catálogo.
            </p>
          </div>
          <Link
            href="/productos/nuevo"
            className="flex min-h-11 items-center gap-2 rounded-md bg-[#16D39A] px-4 text-sm font-semibold text-[#090B0B] transition-colors duration-150 hover:bg-[#16D39A]/90"
          >
            <Plus className="h-4 w-4" />
            Nuevo producto
          </Link>
        </header>

        {productos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-[#222A27] bg-[#111615] px-6 py-12 text-center">
            <p className="text-base text-[#F3F5F4]">Todavía no cargaste ningún producto.</p>
            <p className="text-sm text-[#A6AEAA]">
              Los productos que des de alta van a aparecer acá, ej. Yerba mate 1kg.
            </p>
            <Link
              href="/productos/nuevo"
              className="mt-4 flex min-h-11 items-center gap-2 rounded-md bg-[#16D39A] px-4 text-sm font-semibold text-[#090B0B] transition-colors duration-150 hover:bg-[#16D39A]/90"
            >
              <Plus className="h-4 w-4" />
              Crear primer producto
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-[#222A27] bg-[#111615]">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#222A27] text-[#A6AEAA]">
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium">Precio</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((producto) => (
                  <tr
                    key={producto.producto_id}
                    className="border-b border-[#222A27] last:border-b-0 hover:bg-[#151A18]"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-[#A6AEAA]">{producto.sku}</td>
                    <td className="px-4 py-3 font-medium text-[#F3F5F4]">{producto.nombre}</td>
                    <td className="px-4 py-3 text-[#A6AEAA]">{producto.categoria ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-[#F3F5F4]">{FORMATO_PRECIO.format(producto.precio)}</td>
                    <td className="px-4 py-3 font-mono text-[#F3F5F4]">{producto.stock_actual}</td>
                    <td className="px-4 py-3">
                      {producto.publicado ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#16D39A]/10 px-2.5 py-1 text-xs font-medium text-[#16D39A]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#16D39A]" aria-hidden="true" />
                          Publicado
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#151A18] border border-[#222A27] px-2.5 py-1 text-xs text-[#A6AEAA]">
                          Sin publicar
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/productos/${producto.producto_id}`}
                          className="inline-flex h-11 px-3 items-center justify-center rounded-md border border-[#222A27] bg-[#0D1110] text-xs font-medium text-[#A6AEAA] hover:border-[#16D39A] hover:text-[#F3F5F4] transition-colors"
                          aria-label={`Editar ${producto.nombre}`}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Editar
                        </Link>
                        <button
                          type="button"
                          onClick={() => setProductoAEliminar(producto)}
                          className="inline-flex h-11 px-3 items-center justify-center rounded-md border border-[#222A27] bg-[#0D1110] text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                          aria-label={`Dar de baja ${producto.nombre}`}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Dar de baja
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPaginas > 1 ? (
          <nav
            className="flex items-center justify-between text-sm text-[#A6AEAA]"
            aria-label="Paginación de productos"
          >
            <Link
              href={`/productos?page=${Math.max(1, paginaActual - 1)}`}
              aria-disabled={paginaActual <= 1}
              className={`flex min-h-11 items-center rounded-md border border-[#222A27] px-4 transition-colors duration-150 ${
                paginaActual <= 1 ? "pointer-events-none opacity-40" : "hover:border-[#16D39A] hover:text-[#F3F5F4]"
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
              className={`flex min-h-11 items-center rounded-md border border-[#222A27] px-4 transition-colors duration-150 ${
                paginaActual >= totalPaginas || isPlaceholderData
                  ? "pointer-events-none opacity-40"
                  : "hover:border-[#16D39A] hover:text-[#F3F5F4]"
              }`}
            >
              Siguiente →
            </Link>
          </nav>
        ) : null}
      </div>

      {/* Modal de Confirmación de Borrado Lógico */}
      {productoAEliminar && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-baja-producto-titulo"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#090B0B]/80 backdrop-blur-sm px-4"
        >
          <div className="flex w-full max-w-md flex-col gap-4 rounded-md border border-[#222A27] bg-[#111615] p-6 shadow-xl">
            <div className="flex items-center gap-3 text-[#EF4444]">
              <AlertCircle className="h-6 w-6 shrink-0" aria-hidden="true" />
              <h2 id="modal-baja-producto-titulo" className="text-lg font-semibold text-[#F3F5F4]">
                Dar de baja producto
              </h2>
            </div>

            <p className="text-sm text-[#A6AEAA]">
              Dar de baja <strong className="text-[#F3F5F4]">{productoAEliminar.nombre}</strong> lo va a ocultar de tu catálogo y de la vidriera pública. Esta acción no se puede deshacer.
            </p>

            {errorDelete && (
              <div className="rounded-md border border-[#EF4444]/20 bg-[#EF4444]/5 p-3 text-xs text-[#EF4444] font-medium flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{obtenerMensajeError(errorDelete)}</span>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end mt-2">
              <button
                type="button"
                disabled={isPendingDelete}
                onClick={() => {
                  setProductoAEliminar(null);
                  setErrorDelete(null);
                }}
                className="min-h-11 rounded-md border border-[#222A27] bg-[#0D1110] px-4 text-sm text-[#A6AEAA] transition-colors duration-150 hover:border-[#16D39A] hover:text-[#F3F5F4] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPendingDelete}
                onClick={confirmarBaja}
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#EF4444] px-4 text-sm font-medium text-slate-50 transition-colors duration-150 hover:bg-[#EF4444]/90 disabled:opacity-50 gap-2"
              >
                {isPendingDelete ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  "Confirmar baja"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
