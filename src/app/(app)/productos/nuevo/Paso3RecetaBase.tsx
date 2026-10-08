"use client";

import { Trash2 } from "lucide-react";
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

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-[#F3F5F4]">Paso 3: Receta / Insumos</h2>
        <p className="text-sm text-[#A6AEAA]">Definí los componentes y el rendimiento para calcular tus costos.</p>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#F3F5F4]">
            ¿Para cuántas unidades rinde esta receta?
          </label>
          <input
            type="number"
            min="1"
            step="0.01"
            value={rendimiento || ""}
            onChange={(e) => setRendimiento(parseFloat(e.target.value) || 1)}
            className={`${CLASES_INPUT} max-w-[200px]`}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#F3F5F4]">Agregar Insumos</label>
          <BuscadorInsumos onSeleccionar={agregarInsumo} />
        </div>

        {insumos.length > 0 ? (
          <div className="rounded-lg border border-[#222A27] bg-[#0D1110] overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#151A18] text-[#A6AEAA]">
                <tr>
                  <th className="px-4 py-2 font-medium">Insumo</th>
                  <th className="px-4 py-2 font-medium">Cantidad</th>
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
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[#222A27] p-8 text-center text-[#A6AEAA]">
            Aún no agregaste insumos a la receta. Podés omitir este paso si solo querés vender el producto directo.
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
            Guardar sin Costos
          </button>
          <button
            type="button"
            onClick={alSiguiente}
            disabled={estaEnviando}
            className="flex min-h-11 items-center justify-center rounded-md bg-[#16D39A] px-5 text-sm font-semibold text-[#090B0B] hover:bg-[#16D39A]/90 transition-colors"
          >
            Siguiente: Costos
          </button>
        </div>
      </div>
    </div>
  );
}

