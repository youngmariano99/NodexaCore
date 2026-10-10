"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, AlertCircle, PackageOpen } from "lucide-react";

import { MensajeError } from "@/components/errores/MensajeError";
import { useInsumosPaginados } from "@/hooks/useInsumosPaginados";
import { eliminarProducto } from "@/services/productos/eliminarProducto";
import { ESTADO_ELIMINAR_PRODUCTO_INICIAL } from "@/services/productos/tipos";
import type { FilaInsumoListado } from "@/repositories/insumosRepository";
import { ModalAltaInsumo } from "./ModalAltaInsumo";

const FORMATO_PRECIO = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

export function ListadoInsumos() {
  const searchParams = useSearchParams();
  const paginaActual = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const queryClient = useQueryClient();

  const { data, isPending, isError, isPlaceholderData } = useInsumosPaginados(paginaActual);
  const [insumoAEliminar, setInsumoAEliminar] = useState<FilaInsumoListado | null>(null);
  const [isPendingDelete, startTransitionDelete] = useTransition();
  const [errorDelete, setErrorDelete] = useState<string | null>(null);
  
  const [modalAbierto, setModalAbierto] = useState(false);

  if (isPending) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#090B0B] px-6 py-10 text-[#A6AEAA]">
        Cargando insumos...
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

  const { insumos, total, porPagina } = data;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  const confirmarBaja = () => {
    if (!insumoAEliminar) return;

    setErrorDelete(null);
    startTransitionDelete(async () => {
      const resultado = await eliminarProducto(
        insumoAEliminar.producto_id,
        ESTADO_ELIMINAR_PRODUCTO_INICIAL,
        new FormData()
      );

      if (resultado.exito) {
        await queryClient.invalidateQueries({ queryKey: ["insumos"] });
        setInsumoAEliminar(null);
      } else {
        setErrorDelete(resultado.error);
      }
    });
  };

  return (
    <div className="flex flex-1 flex-col bg-[#090B0B] px-6 py-10 text-[#F3F5F4]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-[#F3F5F4]">Insumos y Recetas</h1>
            <p className="text-sm text-[#A6AEAA]">
              {total} insumo{total === 1 ? "" : "s"} registrado{total === 1 ? "" : "s"}.
            </p>
          </div>
          <button
            onClick={() => setModalAbierto(true)}
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#16D39A] px-4 text-sm font-semibold text-[#090B0B] transition-colors duration-150 hover:bg-[#16D39A]/90"
          >
            <Plus className="h-4 w-4" />
            Nuevo insumo
          </button>
        </header>

        {insumos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-[#222A27] bg-[#111615] px-6 py-12 text-center">
            <PackageOpen className="h-12 w-12 text-[#A6AEAA] mb-2" />
            <p className="text-base font-medium text-[#F3F5F4]">Todavía no tenés insumos.</p>
            <p className="text-sm text-[#A6AEAA]">
              Cargá tus materias primas o pre-elaborados para usarlos en tus productos.
            </p>
          </div>
        ) : (
          <div className="flex flex-col rounded-md border border-[#222A27] bg-[#0D1110] overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#222A27] bg-[#111615] text-[#A6AEAA]">
                <tr>
                  <th className="px-6 py-4 font-medium">SKU</th>
                  <th className="px-6 py-4 font-medium">Nombre</th>
                  <th className="px-6 py-4 font-medium">Tipo</th>
                  <th className="px-6 py-4 font-medium">Costo Unitario</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222A27]">
                {insumos.map((insumo) => {
                  let tieneReceta = false;
                  if (insumo.recetas) {
                    if (Array.isArray(insumo.recetas)) {
                      tieneReceta = insumo.recetas.length > 0;
                    } else {
                      tieneReceta = true;
                    }
                  }
                  return (
                    <tr key={insumo.producto_id} className="hover:bg-[#151A18] transition-colors">
                      <td className="px-6 py-4 text-[#A6AEAA] font-mono text-xs">{insumo.sku}</td>
                      <td className="px-6 py-4 font-medium text-[#F3F5F4]">{insumo.nombre}</td>
                      <td className="px-6 py-4">
                        {tieneReceta ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400">
                            Pre-elaborado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                            Materia prima
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[#F3F5F4]">{FORMATO_PRECIO.format(insumo.precio)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setInsumoAEliminar(insumo)}
                          className="p-2 text-[#A6AEAA] hover:text-red-400 transition-colors"
                          title="Eliminar insumo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPaginas > 1 && (
          <div className="flex items-center justify-between border-t border-[#222A27] pt-4">
            <span className="text-sm text-[#A6AEAA]">
              Página {paginaActual} de {totalPaginas}
            </span>
            <div className="flex gap-2">
              <button
                disabled={paginaActual === 1 || isPlaceholderData}
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set("page", String(paginaActual - 1));
                  window.history.pushState(null, "", url.toString());
                }}
                className="rounded-md border border-[#222A27] bg-[#111615] px-4 py-2 text-sm text-[#F3F5F4] hover:bg-[#151A18] disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                disabled={paginaActual === totalPaginas || isPlaceholderData}
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set("page", String(paginaActual + 1));
                  window.history.pushState(null, "", url.toString());
                }}
                className="rounded-md border border-[#222A27] bg-[#111615] px-4 py-2 text-sm text-[#F3F5F4] hover:bg-[#151A18] disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {insumoAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-[#222A27] bg-[#0D1110] p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-[#F3F5F4]">Eliminar Insumo</h3>
            </div>
            
            <p className="text-sm text-[#A6AEAA]">
              ¿Estás seguro de que querés eliminar el insumo <strong>{insumoAEliminar.nombre}</strong>? 
              Los productos que lo usen ya no lo tendrán en su receta.
            </p>

            {errorDelete && (
              <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-400">
                {errorDelete === "NX-SYS-001" ? "Error del servidor." : errorDelete}
              </div>
            )}

            <div className="mt-2 flex justify-end gap-3">
              <button
                onClick={() => {
                  setInsumoAEliminar(null);
                  setErrorDelete(null);
                }}
                disabled={isPendingDelete}
                className="rounded-md px-4 py-2 text-sm font-medium text-[#A6AEAA] hover:text-[#F3F5F4] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarBaja}
                disabled={isPendingDelete}
                className="flex min-w-24 items-center justify-center rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isPendingDelete ? <Loader2 className="h-4 w-4 animate-spin" /> : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAbierto && (
        <ModalAltaInsumo 
          alCerrar={() => setModalAbierto(false)} 
          alGuardar={() => {
            setModalAbierto(false);
            queryClient.invalidateQueries({ queryKey: ["insumos"] });
          }} 
        />
      )}
    </div>
  );
}
