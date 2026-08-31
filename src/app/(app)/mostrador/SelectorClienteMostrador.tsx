"use client";

import { useState, useRef, useEffect } from "react";
import { Search, User, X, Loader2 } from "lucide-react";

import { useBuscarClientesFinales, type ClienteFinalBusqueda } from "@/hooks/useBuscarClientesFinales";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useHotkeys } from "@/hooks/useHotkeys";

interface SelectorClienteMostradorProps {
  clienteSeleccionado: ClienteFinalBusqueda | null;
  onSeleccionarCliente: (cliente: ClienteFinalBusqueda | null) => void;
}

export function SelectorClienteMostrador({
  clienteSeleccionado,
  onSeleccionarCliente,
}: SelectorClienteMostradorProps) {
  const [termino, setTermino] = useState("");
  const terminoDebounced = useDebouncedValue(termino, 300);
  const { data: resultados, isFetching } = useBuscarClientesFinales(terminoDebounced);
  
  const [isOpen, setIsOpen] = useState(false);
  const refContainer = useRef<HTMLDivElement>(null);

  useHotkeys(
    "Escape",
    () => {
      setIsOpen(false);
    },
    { enabled: isOpen, allowInInputs: true }
  );

  // Cerrar dropdown al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (refContainer.current && !refContainer.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-1.5" ref={refContainer}>
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Cliente (Cuenta Corriente)
      </label>

      {clienteSeleccionado ? (
        <div className="flex items-center justify-between rounded-md border border-[#222A27] bg-[#111615] px-3 py-2 text-sm text-slate-100">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-emerald-500" />
            <div className="flex flex-col">
              <span className="font-semibold text-slate-50">{clienteSeleccionado.nombre}</span>
              <span className="text-xs text-slate-400">
                {clienteSeleccionado.telefono || "Sin teléfono"} · Deuda: ${clienteSeleccionado.saldo_deudor.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSeleccionarCliente(null)}
            className="text-slate-400 hover:text-red-400 transition-colors p-1"
            aria-label="Quitar cliente seleccionado"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={termino}
            onChange={(e) => {
              setTermino(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Buscar cliente para fiar (opcional)..."
            className="min-h-11 w-full rounded-md border border-[#222A27] bg-[#111615] pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />

          {isOpen && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-[#222A27] bg-[#111615] shadow-lg divide-y divide-slate-700">
              {isFetching && (
                <div className="p-3 text-xs text-slate-400 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Buscando...
                </div>
              )}
              
              {!isFetching && (
                <button
                  type="button"
                  onClick={() => {
                    onSeleccionarCliente(null);
                    setIsOpen(false);
                    setTermino("");
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-emerald-500 hover:bg-slate-700 transition-colors font-medium"
                >
                  Consumidor Final (Efectivo / Débito)
                </button>
              )}

              {!isFetching && resultados?.length === 0 && termino.trim() !== "" && (
                <div className="p-3 text-xs text-slate-400 text-center">
                  No se encontraron clientes.
                </div>
              )}

              {!isFetching && resultados?.map((cliente) => (
                <button
                  key={cliente.cliente_final_id}
                  type="button"
                  onClick={() => {
                    onSeleccionarCliente(cliente);
                    setIsOpen(false);
                    setTermino("");
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors flex flex-col"
                >
                  <span className="font-medium text-slate-100">{cliente.nombre}</span>
                  <span className="text-xs text-slate-400">
                    {cliente.telefono || "Sin teléfono"} · Deuda: ${cliente.saldo_deudor.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
