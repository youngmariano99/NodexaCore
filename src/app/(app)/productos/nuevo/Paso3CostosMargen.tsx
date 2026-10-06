"use client";

import { useMemo } from "react";
import { Info } from "lucide-react";
import { type InsumoReceta } from "./Paso2RecetaInsumos";

interface Paso3CostosMargenProps {
  insumos: InsumoReceta[];
  rendimiento: number;
  precioVentaActual: number;
  margenMeta: number;
  setMargenMeta: React.Dispatch<React.SetStateAction<number>>;
  setPrecio: React.Dispatch<React.SetStateAction<number>>;
  alAtras: () => void;
  alFinalizar: () => void;
  estaEnviando: boolean;
}

const CLASES_INPUT = "flex h-11 w-full rounded-md border border-[#222A27] bg-[#090B0B] px-3 py-2 text-sm text-[#F3F5F4] outline-none transition-colors placeholder:text-[#A6AEAA] focus:border-[#16D39A] focus:ring-1 focus:ring-[#16D39A] disabled:cursor-not-allowed disabled:opacity-50";

export function Paso3CostosMargen({
  insumos,
  rendimiento,
  precioVentaActual,
  margenMeta,
  setMargenMeta,
  setPrecio,
  alAtras,
  alFinalizar,
  estaEnviando,
}: Paso3CostosMargenProps) {
  const costoTotalReceta = useMemo(() => {
    return insumos.reduce((acc, i) => acc + i.cantidad * i.precio, 0);
  }, [insumos]);

  const costoUnitario = rendimiento > 0 ? costoTotalReceta / rendimiento : 0;
  
  const precioSugerido = costoUnitario * (1 + margenMeta / 100);
  
  const rentabilidadReal = precioVentaActual > 0 
    ? ((precioVentaActual - costoUnitario) / costoUnitario) * 100 
    : 0;

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-[#F3F5F4]">Paso 3: Costos y Margen</h2>
        <p className="text-sm text-[#A6AEAA]">Ajustá tu precio de venta según tus costos de producción.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-[#222A27] bg-[#0D1110] p-4 flex flex-col gap-1">
          <span className="text-sm font-medium text-[#A6AEAA]">Costo Unitario Calculado</span>
          <span className="text-2xl font-bold text-[#F3F5F4]">${costoUnitario.toFixed(2)}</span>
        </div>
        <div className={`rounded-lg border p-4 flex flex-col gap-1 ${rentabilidadReal >= margenMeta ? 'border-[#16D39A] bg-[#16D39A]/5' : 'border-yellow-500 bg-yellow-500/5'}`}>
          <span className="text-sm font-medium text-[#A6AEAA]">Rentabilidad Actual</span>
          <span className={`text-2xl font-bold ${rentabilidadReal >= margenMeta ? 'text-[#16D39A]' : 'text-yellow-500'}`}>
            {rentabilidadReal.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-[#F3F5F4]">
            Margen de Ganancia Meta (%)
            <Info className="h-4 w-4 text-[#A6AEAA]" />
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={margenMeta || ""}
            onChange={(e) => setMargenMeta(parseFloat(e.target.value) || 0)}
            className={`${CLASES_INPUT} max-w-[200px]`}
          />
        </div>

        <div className="rounded-lg border border-[#222A27] bg-[#151A18] p-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-[#A6AEAA]">Precio de Venta Sugerido</div>
            <div className="text-xl font-bold text-[#F3F5F4]">${Math.ceil(precioSugerido).toFixed(2)}</div>
          </div>
          <button
            type="button"
            onClick={() => setPrecio(Math.ceil(precioSugerido))}
            className="flex h-9 items-center justify-center rounded-md border border-[#16D39A] px-4 text-xs font-semibold text-[#16D39A] hover:bg-[#16D39A]/10 transition-colors"
          >
            Aplicar Sugerencia
          </button>
        </div>
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
        <button
          type="button"
          onClick={alFinalizar}
          disabled={estaEnviando}
          className="flex min-h-11 items-center justify-center rounded-md bg-[#16D39A] px-5 text-sm font-semibold text-[#090B0B] hover:bg-[#16D39A]/90 transition-colors"
        >
          Guardar Producto
        </button>
      </div>
    </div>
  );
}
