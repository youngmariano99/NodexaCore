"use client";

import { useState } from "react";
import { Trash2, Calculator, Package } from "lucide-react";
import { BuscadorInsumos } from "./BuscadorInsumos";

export interface InsumoReceta {
  producto_id: string;
  sku: string;
  nombre: string;
  precio: number;
  cantidad: number;
}

interface Paso3RecetaBaseProps {
  insumos: InsumoReceta[];
  setInsumos: React.Dispatch<React.SetStateAction<InsumoReceta[]>>;
  rendimiento: number;
  setRendimiento: React.Dispatch<React.SetStateAction<number>>;
  alAtras: () => void;
  alSiguiente: () => void;
  alFinalizar: () => void;
  estaEnviando: boolean;
}

const CLASES_INPUT = "flex h-11 w-full rounded-md border border-[#222A27] bg-[#090B0B] px-3 py-2 text-sm text-[#F3F5F4] outline-none transition-colors placeholder:text-[#A6AEAA] focus:border-[#16D39A] focus:ring-1 focus:ring-[#16D39A] disabled:cursor-not-allowed disabled:opacity-50";

export function Paso3RecetaBase({
  insumos,
  setInsumos,
  rendimiento,
  setRendimiento,
  alAtras,
  alSiguiente,
  alFinalizar,
  estaEnviando,
}: Paso3RecetaBaseProps) {
  // Estado local para determinar si el usuario quiere armar la receta para 1 unidad o para todo el lote
  const [esLote, setEsLote] = useState<boolean>(rendimiento > 1);

  const agregarInsumo = (insumoBase: { producto_id: string; sku: string; nombre: string; precio: number }) => {
    if (insumos.some((i) => i.producto_id === insumoBase.producto_id)) return;
    setInsumos([...insumos, { ...insumoBase, cantidad: 1 }]);
  };

  const actualizarCantidad = (id: string, cant: number) => {
    setInsumos(insumos.map((i) => (i.producto_id === id ? { ...i, cantidad: cant } : i)));
  };

  const eliminarInsumo = (id: string) => {
    setInsumos(insumos.filter((i) => i.producto_id !== id));
  };

  const manejarCambioModo = (modoLote: boolean) => {
    setEsLote(modoLote);
    if (!modoLote) {
      setRendimiento(1);
    }
  };

  const costoTotalBase = insumos.reduce((acc, insumo) => acc + insumo.precio * insumo.cantidad, 0);
  const costoPorUnidad = rendimiento > 0 ? costoTotalBase / rendimiento : 0;

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-[#F3F5F4]">Paso 3: Receta Base</h2>
        <p className="text-sm text-[#A6AEAA]">Definí los insumos que comparten absolutamente todas las variantes de este producto.</p>
      </div>

      {/* Interruptor de Modo Educativo */}
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => manejarCambioModo(false)}
          className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
            !esLote 
              ? "border-[#16D39A] bg-[#16D39A]/10 text-[#16D39A]" 
              : "border-[#222A27] bg-[#090B0B] text-[#A6AEAA] hover:border-[#A6AEAA]"
          }`}
        >
          <Package className="h-6 w-6 mb-2" />
          <span className="font-semibold text-sm">Armar para 1 unidad</span>
          <span className="text-xs mt-1 text-center opacity-80">Ideal si conocés qué lleva 1 sola unidad</span>
        </button>
        <button
          type="button"
          onClick={() => manejarCambioModo(true)}
          className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
            esLote 
              ? "border-[#16D39A] bg-[#16D39A]/10 text-[#16D39A]" 
              : "border-[#222A27] bg-[#090B0B] text-[#A6AEAA] hover:border-[#A6AEAA]"
          }`}
        >
          <Calculator className="h-6 w-6 mb-2" />
          <span className="font-semibold text-sm">Armar por Lote (Preparación)</span>
          <span className="text-xs mt-1 text-center opacity-80">Calculamos la unidad en base a una cantidad total</span>
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {esLote && (
          <div className="p-4 bg-[#111615] border border-[#222A27] rounded-md animate-in fade-in">
            <label className="mb-1.5 block text-sm font-medium text-[#F3F5F4]">
              ¿Cuántas unidades rinde esta receta / preparación en total?
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                step="0.01"
                value={rendimiento || ""}
                onChange={(e) => setRendimiento(parseFloat(e.target.value) || 1)}
                className={`${CLASES_INPUT} max-w-[150px]`}
              />
              <span className="text-sm text-[#A6AEAA]">unidades finales.</span>
            </div>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#F3F5F4]">
            {esLote ? `Agregar insumos (cantidades necesarias para hacer ${rendimiento} unidades)` : "Agregar insumos (cantidades necesarias para 1 unidad)"}
          </label>
          <BuscadorInsumos onSeleccionar={agregarInsumo} />
        </div>

        {insumos.length > 0 ? (
          <div className="rounded-lg border border-[#222A27] bg-[#0D1110] overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#151A18] text-[#A6AEAA]">
                <tr>
                  <th className="px-4 py-2 font-medium">Insumo</th>
                  <th className="px-4 py-2 font-medium">Cantidad usada</th>
                  <th className="px-4 py-2 font-medium text-right">Costo Parcial</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222A27]">
                {insumos.map((insumo) => (
                  <tr key={insumo.producto_id}>
                    <td className="px-4 py-3 font-medium text-[#F3F5F4]">{insumo.nombre}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={insumo.cantidad || ""}
                        onChange={(e) => actualizarCantidad(insumo.producto_id, parseFloat(e.target.value) || 0)}
                        className="h-8 w-24 rounded-md border border-[#222A27] bg-[#090B0B] px-2 text-sm text-[#F3F5F4] focus:border-[#16D39A] focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[#F3F5F4]">
                      ${(insumo.cantidad * insumo.precio).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => eliminarInsumo(insumo.producto_id)}
                        className="text-[#EF4444] hover:text-[#EF4444]/80 p-1 rounded-md"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="bg-[#151A18] p-4 flex justify-between items-center border-t border-[#222A27]">
               <div className="flex flex-col">
                  <span className="text-xs text-[#A6AEAA]">Costo {esLote ? `del lote (${rendimiento}u)` : "Total"}</span>
                  <span className="font-semibold text-[#F3F5F4]">${costoTotalBase.toFixed(2)}</span>
               </div>
               {esLote && (
                 <div className="flex flex-col text-right">
                    <span className="text-xs text-[#A6AEAA]">Costo Unitario</span>
                    <span className="font-bold text-[#16D39A] text-lg">${costoPorUnidad.toFixed(2)}</span>
                 </div>
               )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[#222A27] p-8 text-center text-[#A6AEAA]">
            Aún no agregaste insumos base a la receta. Si no lleva insumos en común, podés saltar este paso.
          </div>
        )}
      </div>

      <div className="flex justify-between mt-4">
        <button
          type="button"
          onClick={alAtras}
          disabled={estaEnviando}
          className="flex min-h-11 items-center justify-center rounded-md border border-[#222A27] px-5 text-sm font-semibold text-[#F3F5F4] hover:bg-[#222A27] transition-colors"
        >
          Atrás
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={alFinalizar}
            disabled={estaEnviando}
            className="flex min-h-11 items-center justify-center rounded-md border border-[#16D39A] px-5 text-sm font-semibold text-[#16D39A] hover:bg-[#16D39A]/10 transition-colors"
          >
            Guardar sin Matriz
          </button>
          <button
            type="button"
            onClick={alSiguiente}
            disabled={estaEnviando}
            className="flex min-h-11 items-center justify-center rounded-md bg-[#16D39A] px-5 text-sm font-semibold text-[#090B0B] hover:bg-[#16D39A]/90 transition-colors"
          >
            Siguiente: Matriz Gastronómica
          </button>
        </div>
      </div>
    </div>
  );
}
