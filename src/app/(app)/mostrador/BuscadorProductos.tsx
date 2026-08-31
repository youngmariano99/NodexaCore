"use client";

import { Plus, Search } from "lucide-react";
import { useActionState, useReducer, useState, useRef, useEffect } from "react";

import { MensajeError } from "@/components/errores/MensajeError";
import { useBuscarProductos } from "@/hooks/useBuscarProductos";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useMetodosPagoComercio } from "@/hooks/useMetodosPagoComercio";
import {
  calcularTotalVentaConAjuste,
  METODOS_PAGO_POR_DEFECTO,
  type ReglaMetodoPago,
} from "@/lib/dominio/ventas/calcularTotalVenta";
import { ESTADO_CARRITO_INICIAL, reducirCarrito } from "@/lib/dominio/ventas/carritoReducer";
import type { FilaProductoBusqueda } from "@/repositories/productosRepository";
import { confirmarVenta } from "@/services/ventas/confirmarVenta";
import { ESTADO_CONFIRMAR_VENTA_INICIAL } from "@/services/ventas/tipos";

import { CarritoVenta } from "@/app/(app)/mostrador/CarritoVenta";
import { ConfirmarCobro } from "@/app/(app)/mostrador/ConfirmarCobro";
import { ResumenTotal } from "@/app/(app)/mostrador/ResumenTotal";
import { SelectorClienteMostrador } from "@/app/(app)/mostrador/SelectorClienteMostrador";
import { SelectorMetodoPagoMostrador } from "@/app/(app)/mostrador/SelectorMetodoPagoMostrador";
import type { ClienteFinalBusqueda } from "@/hooks/useBuscarClientesFinales";

const FORMATO_PRECIO = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
const DEMORA_DEBOUNCE_MS = 300;

/**
 * Panel de búsqueda + carrito del Mostrador (docs/BACKLOG.md "Componente de
 * búsqueda y carrito en Panel de Ventas" + "Server Action confirmarVenta con
 * idempotency_key"). El carrito vive acá como `useReducer` en estado
 * puramente local: no hay ningún `localStorage`/`sessionStorage` de por
 * medio, así que se pierde a propósito al recargar la página a mitad de una
 * venta.
 *
 * El término de búsqueda se debouncea (`useDebouncedValue`, 300ms) antes de
 * llegar a `useBuscarProductos`: escribir "yerba" dispara como máximo una
 * consulta a `/api/productos/buscar`, no una por tecla.
 *
 * `idempotencyKey` se genera una sola vez por venta en curso
 * (`crypto.randomUUID()`) y viaja igual en cada reintento del mismo envío;
 * al confirmarse la venta con éxito se vacía el carrito y se genera una
 * clave nueva para la próxima, ambos ajustes hechos durante el render (ver
 * comentario más abajo) para que ocurran en el mismo ciclo que la respuesta
 * de `confirmarVenta`, sin un `useEffect` de por medio.
 */
export function BuscadorProductos() {
  const [terminoBusqueda, setTerminoBusqueda] = useState("");
  const [carrito, dispatch] = useReducer(reducirCarrito, ESTADO_CARRITO_INICIAL);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState("efectivo");
  const { data: metodosData } = useMetodosPagoComercio();
  const metodos: ReglaMetodoPago[] = metodosData || METODOS_PAGO_POR_DEFECTO;

  const [estadoVenta, accionConfirmarVenta, confirmandoVenta] = useActionState(
    confirmarVenta,
    ESTADO_CONFIRMAR_VENTA_INICIAL,
  );
  const [ultimoEstadoVentaVisto, setUltimoEstadoVentaVisto] = useState(estadoVenta);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteFinalBusqueda | null>(null);
  const [indiceSeleccionado, setIndiceSeleccionado] = useState(0);

  const inputBusquedaRef = useRef<HTMLInputElement>(null);
  const formCobroRef = useRef<HTMLFormElement>(null);

  // Ajuste de estado durante el render (patrón recomendado por React en vez
  // de un efecto: https://react.dev/learn/you-might-not-need-an-effect):
  // cada componente ajusta acá su PROPIO estado (carrito, idempotencyKey) —
  // nunca el de un componente hijo/padre distinto — ante una venta recién
  // confirmada.
  if (estadoVenta !== ultimoEstadoVentaVisto) {
    setUltimoEstadoVentaVisto(estadoVenta);
    if (estadoVenta.exito) {
      dispatch({ tipo: "VACIAR_CARRITO" });
      setIdempotencyKey(crypto.randomUUID());
      setClienteSeleccionado(null);
    }
  }

  const terminoDebounced = useDebouncedValue(terminoBusqueda, DEMORA_DEBOUNCE_MS);
  const { data: resultados, isFetching, isError } = useBuscarProductos(terminoDebounced);

  // Foco inicial al cargar y tras confirmar venta exitosa
  useEffect(() => {
    if (estadoVenta.exito) {
      inputBusquedaRef.current?.focus();
    }
  }, [estadoVenta.exito]);

  // Atajo para enfocar el buscador (F2, F3, /, Ctrl+K, Cmd+K)
  useHotkeys(
    ["f2", "f3", "/", "ctrl+k", "meta+k"],
    (evento) => {
      evento.preventDefault();
      inputBusquedaRef.current?.focus();
      inputBusquedaRef.current?.select();
    }
  );

  // Atajo para cancelar operaciones (Escape)
  useHotkeys(
    "Escape",
    () => {
      if (terminoBusqueda) {
        setTerminoBusqueda("");
      } else if (clienteSeleccionado) {
        setClienteSeleccionado(null);
      }
      inputBusquedaRef.current?.focus();
    },
    { allowInInputs: true }
  );

  // Atajo global para confirmar cobro (Enter cuando el foco no está en un input o cuando el carrito tiene items)
  useHotkeys(
    "Enter",
    () => {
      if (carrito.length > 0 && !confirmandoVenta) {
        formCobroRef.current?.requestSubmit();
      }
    }
  );

  // Atajos numéricos para seleccionar método de pago (1 - 5) cuando el foco no está en inputs
  useHotkeys(
    ["1", "2", "3", "4", "5"],
    (evento) => {
      const index = Number.parseInt(evento.key, 10) - 1;
      const metodosActivos = metodos.filter((m) => m.activo);
      const metodo = metodosActivos[index];
      if (metodo) {
        setMetodoPagoSeleccionado(metodo.metodoPago);
      }
    }
  );

  // Atajos con Alt (Alt+1 a Alt+5) disponibles incluso con foco
  useHotkeys(
    ["alt+1", "alt+2", "alt+3", "alt+4", "alt+5"],
    (evento) => {
      evento.preventDefault();
      const numStr = evento.key;
      const index = Number.parseInt(numStr, 10) - 1;
      const metodosActivos = metodos.filter((m) => m.activo);
      const metodo = metodosActivos[index];
      if (metodo) {
        setMetodoPagoSeleccionado(metodo.metodoPago);
      }
    },
    { allowInInputs: true }
  );

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

  function manejarKeyDownInput(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown" && mostrandoResultados && resultados && resultados.length > 0) {
      evento.preventDefault();
      setIndiceSeleccionado((prev) => Math.min(prev + 1, resultados.length - 1));
    } else if (evento.key === "ArrowUp" && mostrandoResultados && resultados && resultados.length > 0) {
      evento.preventDefault();
      setIndiceSeleccionado((prev) => Math.max(prev - 1, 0));
    } else if (evento.key === "Enter") {
      if (mostrandoResultados && resultados && resultados.length > 0) {
        const prod = resultados[indiceSeleccionado] ?? resultados[0];
        if (prod && prod.stock_actual > 0) {
          evento.preventDefault();
          agregarAlCarrito(prod);
          setTerminoBusqueda("");
          setIndiceSeleccionado(0);
        }
      } else if (terminoBusqueda.trim() === "" && carrito.length > 0 && !confirmandoVenta) {
        evento.preventDefault();
        formCobroRef.current?.requestSubmit();
      }
    } else if (evento.key === "Escape") {
      setTerminoBusqueda("");
      setIndiceSeleccionado(0);
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-[#090B0B] px-6 py-10 text-slate-50">
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
              ref={inputBusquedaRef}
              type="text"
              value={terminoBusqueda}
              onChange={(evento) => {
                setTerminoBusqueda(evento.target.value);
                setIndiceSeleccionado(0);
              }}
              onKeyDown={manejarKeyDownInput}
              placeholder="ej. yerba, DP-00001"
              aria-label="Buscar producto por SKU o nombre"
              className="min-h-11 w-full rounded-md border border-[#222A27] bg-[#111615] py-2 pl-10 pr-20 text-sm text-slate-50 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
            />
            <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
              <kbd className="rounded border border-[#222A27] bg-[#151A18] px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                F2
              </kbd>
              <span className="text-[10px] text-slate-500">o</span>
              <kbd className="rounded border border-[#222A27] bg-[#151A18] px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                /
              </kbd>
            </div>
          </div>

          {isError ? <MensajeError codigo="NX-SYS-001" /> : null}

          {mostrandoResultados ? (
            <ul className="flex flex-col gap-2" aria-live="polite">
              {isFetching && !resultados ? (
                <li className="rounded-md border border-[#222A27] bg-[#111615] px-4 py-6 text-center text-sm text-slate-400">
                  Buscando...
                </li>
              ) : null}

              {resultados && resultados.length === 0 ? (
                <li className="rounded-md border border-dashed border-[#222A27] bg-[#111615] px-4 py-6 text-center text-sm text-slate-400">
                  No encontramos productos para &ldquo;{terminoDebounced}&rdquo;.
                </li>
              ) : null}

              {resultados?.map((producto, index) => {
                const sinStock = producto.stock_actual <= 0;
                const esActivo = index === indiceSeleccionado;

                return (
                  <li
                    key={producto.producto_id}
                    className={`flex items-center justify-between gap-3 rounded-md border px-4 py-3 transition-colors ${
                      esActivo
                        ? "border-emerald-500/70 bg-[#151A18] ring-1 ring-emerald-500/30"
                        : "border-[#222A27] bg-[#111615]"
                    }`}
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
                          ? "cursor-not-allowed border-[#222A27] text-slate-700"
                          : "border-emerald-500 text-emerald-500 hover:bg-emerald-500/10"
                      }`}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="rounded-md border border-dashed border-[#222A27] bg-[#111615] px-4 py-6 text-center text-sm text-slate-400">
                Empezá a escribir para buscar productos.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-[#222A27] bg-[#151A18] px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                    F2
                  </kbd>{" "}
                  o{" "}
                  <kbd className="rounded border border-[#222A27] bg-[#151A18] px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                    /
                  </kbd>{" "}
                  Buscar
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-[#222A27] bg-[#151A18] px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                    ↑ ↓
                  </kbd>{" "}
                  Navegar
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-[#222A27] bg-[#151A18] px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                    ↵ Enter
                  </kbd>{" "}
                  Agregar / Cobrar
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-[#222A27] bg-[#151A18] px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                    Esc
                  </kbd>{" "}
                  Cancelar
                </span>
              </div>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-slate-400">Venta en curso</h2>
          <SelectorMetodoPagoMostrador
            metodos={metodos}
            metodoSeleccionado={metodoPagoSeleccionado}
            onSeleccionarMetodo={setMetodoPagoSeleccionado}
          />
          <SelectorClienteMostrador
            clienteSeleccionado={clienteSeleccionado}
            onSeleccionarCliente={setClienteSeleccionado}
          />
          <CarritoVenta items={carrito} dispatch={dispatch} />
          {(() => {
            const reglaActual =
              metodos.find((m) => m.metodoPago === metodoPagoSeleccionado) ||
              metodos[0] ||
              METODOS_PAGO_POR_DEFECTO[0]!;

            const itemsDeVenta = carrito.map((item) => ({
              productoId: item.productoId,
              precioUnitario: item.precio,
              cantidad: item.cantidad,
            }));

            const calculoTotal = calcularTotalVentaConAjuste(
              itemsDeVenta,
              reglaActual.tipoAjuste,
              reglaActual.porcentaje
            );

            return (
              <>
                <ResumenTotal
                  items={carrito}
                  tipoAjuste={reglaActual.tipoAjuste}
                  porcentaje={reglaActual.porcentaje}
                  etiquetaMetodo={reglaActual.etiqueta}
                />
                <ConfirmarCobro
                  formRef={formCobroRef}
                  idempotencyKey={idempotencyKey}
                  clienteFinalId={clienteSeleccionado?.cliente_final_id || null}
                  metodoPago={metodoPagoSeleccionado}
                  porcentajeAjuste={reglaActual.porcentaje}
                  montoAjuste={calculoTotal.montoAjuste}
                  items={JSON.stringify(
                    carrito.map((item) => ({ productoId: item.productoId, cantidad: item.cantidad })),
                  )}
                  total={calculoTotal.totalFinal}
                  carritoVacio={carrito.length === 0}
                  estado={estadoVenta}
                  estaEnviando={confirmandoVenta}
                  accionFormulario={accionConfirmarVenta}
                />
              </>
            );
          })()}
        </section>
      </div>
    </div>
  );
}
