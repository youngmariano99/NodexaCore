"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { PackageMinus, PackageOpen, PackagePlus, X, Search, Loader2 } from "lucide-react";

import { MensajeError } from "@/components/errores/MensajeError";
import { useMovimientosStockPaginados, invalidarMovimientosStock } from "@/hooks/useMovimientosStockPaginados";
import { useBuscarProductos } from "@/hooks/useBuscarProductos";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { registrarEntradaStock } from "@/services/stock/registrarEntradaStock";
import { registrarSalidaStock } from "@/services/stock/registrarSalidaStock";
import {
  ESTADO_REGISTRAR_ENTRADA_STOCK_INICIAL,
  ESTADO_REGISTRAR_SALIDA_STOCK_INICIAL,
} from "@/services/stock/tipos";
import type { FilaMovimientoStockListado } from "@/repositories/movimientosStockRepository";
import type { FilaProductoBusqueda } from "@/repositories/productosRepository";

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

interface ModalMovimientoStockProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function ModalMovimientoStock({ isOpen, onClose, onSuccess }: ModalMovimientoStockProps) {
  const [terminoBusqueda, setTerminoBusqueda] = useState("");
  const terminoDebounced = useDebouncedValue(terminoBusqueda, 300);
  const { data: resultados, isFetching } = useBuscarProductos(terminoDebounced);
  
  const [productoSeleccionado, setProductoSeleccionado] = useState<FilaProductoBusqueda | null>(null);
  const [tipoMovimiento, setTipoMovimiento] = useState<"entrada" | "salida">("entrada");
  const [cantidad, setCantidad] = useState<string>("");
  
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [isPendingSubmit, startTransitionSubmit] = useTransition();

  const refDropdown = useRef<HTMLDivElement>(null);


  // Cerrar el dropdown al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (refDropdown.current && !refDropdown.current.contains(event.target as Node)) {
        setTerminoBusqueda("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    // Validar en cliente y aplicar patrones Fail-Fast
    if (!productoSeleccionado) {
      setErrorLocal("El producto es obligatorio.");
      return;
    }

    const cantidadNum = Number(cantidad);
    if (!cantidad || Number.isNaN(cantidadNum)) {
      setErrorLocal("La cantidad es obligatoria.");
      return;
    }

    if (!Number.isInteger(cantidadNum)) {
      setErrorLocal("La cantidad debe ser un número entero.");
      return;
    }

    if (cantidadNum <= 0) {
      setErrorLocal("La cantidad debe ser mayor a cero.");
      return;
    }

    startTransitionSubmit(async () => {
      const formData = new FormData();
      formData.append("producto_id", productoSeleccionado.producto_id);
      formData.append("cantidad", String(cantidadNum));

      const serverAction = tipoMovimiento === "entrada" ? registrarEntradaStock : registrarSalidaStock;
      const estadoInicial = tipoMovimiento === "entrada" ? ESTADO_REGISTRAR_ENTRADA_STOCK_INICIAL : ESTADO_REGISTRAR_SALIDA_STOCK_INICIAL;

      const resultado = await serverAction(estadoInicial, formData);

      if (resultado.exito) {
        onSuccess();
        onClose();
      } else {
        setErrorLocal(resultado.error);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-lg border border-[#222A27] bg-[#0D1110] p-6 text-slate-50 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#222A27] pb-4">
          <h2 className="text-lg font-semibold text-slate-50">Registrar Movimiento de Stock</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-[#111615] hover:text-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          {errorLocal && (
            <MensajeError codigo={errorLocal} className="w-full" />
          )}

          {/* Selector de Producto */}
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Producto
            </label>

            {productoSeleccionado ? (
              <div className="flex items-center justify-between rounded-md border border-[#222A27] bg-[#111615] px-3 py-2 text-sm text-slate-100">
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-50">{productoSeleccionado.nombre}</span>
                  <span className="font-mono text-xs text-slate-400">SKU: {productoSeleccionado.sku}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setProductoSeleccionado(null)}
                  className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="relative" ref={refDropdown}>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={terminoBusqueda}
                  onChange={(e) => setTerminoBusqueda(e.target.value)}
                  placeholder="Buscar por SKU o nombre..."
                  className="w-full rounded-md border border-[#222A27] bg-[#111615] pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />

                {terminoDebounced.trim().length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-[#222A27] bg-[#111615] shadow-lg divide-y divide-slate-700">
                    {isFetching && (
                      <div className="p-3 text-xs text-slate-400 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Buscando...
                      </div>
                    )}
                    {!isFetching && resultados?.length === 0 && (
                      <div className="p-3 text-xs text-slate-400 text-center">
                        No se encontraron productos.
                      </div>
                    )}
                    {!isFetching && resultados?.map((prod) => (
                      <button
                        key={prod.producto_id}
                        type="button"
                        onClick={() => {
                          setProductoSeleccionado(prod);
                          setTerminoBusqueda("");
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors flex flex-col"
                      >
                        <span className="font-medium text-slate-100">{prod.nombre}</span>
                        <span className="font-mono text-xs text-slate-400">SKU: {prod.sku}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tipo de Movimiento */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Tipo de Movimiento
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipoMovimiento("entrada")}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-md border text-sm font-semibold transition-all ${
                  tipoMovimiento === "entrada"
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-500"
                    : "border-[#222A27] bg-[#111615]/40 text-slate-400 hover:bg-[#111615] hover:text-slate-300"
                }`}
              >
                <PackagePlus className="h-4 w-4" />
                Entrada
              </button>
              <button
                type="button"
                onClick={() => setTipoMovimiento("salida")}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-md border text-sm font-semibold transition-all ${
                  tipoMovimiento === "salida"
                    ? "bg-red-500/10 border-red-500 text-red-500"
                    : "border-[#222A27] bg-[#111615]/40 text-slate-400 hover:bg-[#111615] hover:text-slate-300"
                }`}
              >
                <PackageMinus className="h-4 w-4" />
                Salida
              </button>
            </div>
          </div>

          {/* Cantidad */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Cantidad
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="ej. 10"
              className="w-full rounded-md border border-[#222A27] bg-[#111615] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-2 border-t border-[#222A27] pt-4 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPendingSubmit}
              className="rounded-md border border-[#222A27] bg-transparent px-4 py-2 text-sm font-medium text-slate-300 hover:bg-[#111615] hover:text-slate-100 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPendingSubmit}
              className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition-colors flex items-center justify-center min-w-[100px]"
            >
              {isPendingSubmit ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirmar"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
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
  const queryClient = useQueryClient();

  const { data, isPending, isError, isPlaceholderData } = useMovimientosStockPaginados(paginaActual, productoId);
  const [abrirModal, setAbrirModal] = useState(false);

  if (isPending) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#090B0B] px-6 py-10 text-slate-400">
        Cargando movimientos de stock...
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

  const { movimientos, total, porPagina } = data;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const sufijoQuery = productoId ? `&productoId=${productoId}` : "";

  const handleSuccess = async () => {
    await invalidarMovimientosStock(queryClient);
  };

  return (
    <div className="flex flex-1 flex-col bg-[#090B0B] px-6 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-row justify-between items-start gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-slate-50">Stock</h1>
            <p className="text-sm text-slate-400">
              {total} movimiento{total === 1 ? "" : "s"} de entrada y salida registrado{total === 1 ? "" : "s"} en tu
              comercio.
            </p>
          </div>
          <button
            onClick={() => setAbrirModal(true)}
            className="flex min-h-11 items-center rounded-md bg-emerald-500 px-4 text-sm font-semibold text-slate-950 transition-colors duration-150 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            Registrar Movimiento
          </button>
        </header>

        {movimientos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-[#222A27] bg-[#111615] px-6 py-12 text-center">
            <PackageOpen className="h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="text-base text-slate-50">Todavía no se registraron movimientos de stock.</p>
            <p className="text-sm text-slate-400">
              Las entradas (mercadería recibida) y salidas (mermas, roturas) que registres van a aparecer acá.
            </p>
            <Link
              href="/productos"
              className="mt-2 flex min-h-11 items-center rounded-md bg-emerald-500 px-4 text-sm font-semibold text-slate-950 transition-colors duration-150 hover:bg-emerald-400"
            >
              Ver catálogo de productos
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-[#222A27] bg-[#111615]">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#222A27] text-slate-400">
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
                    className="border-b border-[#222A27] last:border-b-0 hover:bg-slate-700"
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
              className={`flex min-h-11 items-center rounded-md border border-[#222A27] px-4 transition-colors duration-150 ${
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
              className={`flex min-h-11 items-center rounded-md border border-[#222A27] px-4 transition-colors duration-150 ${
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

      {abrirModal && (
        <ModalMovimientoStock
          isOpen={abrirModal}
          onClose={() => setAbrirModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
