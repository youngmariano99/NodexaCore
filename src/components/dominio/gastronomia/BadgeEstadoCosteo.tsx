"use client";

import React from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { formatearMascaraMoneda } from "@/components/ui/InputDinero";

export interface BadgeEstadoCosteoProps {
  esFabricado: boolean;
  estadoCosteo: "actualizado" | "desactualizado" | null;
  costoTotalCalculado?: number;
  margenMetaSugerido?: number;
  onRecalcularSugerencia?: (nuevoPrecio: number) => void;
}

/**
 * Componente visual (semaforizacin) para el listado de productos de gastronoma.
 * Alerta cuando los insumos de la receta estn encarecidos y sugiere un nuevo precio,
 * o cuando falta definir la receta.
 */
export function BadgeEstadoCosteo({
  esFabricado,
  estadoCosteo,
  costoTotalCalculado = 0,
  margenMetaSugerido = 0,
  onRecalcularSugerencia,
}: BadgeEstadoCosteoProps) {
  if (!esFabricado) return null;

  // Si es fabricado pero no tiene receta (estadoCosteo es null)
  if (!estadoCosteo) {
    return (
      <div className="flex flex-col gap-2 p-3 text-sm rounded-lg bg-orange-50 text-orange-800 border border-orange-300 w-full max-w-sm">
        <div className="flex items-center gap-1.5 font-semibold text-orange-700">
          <Info className="w-4 h-4" />
          <span>Receta incompleta</span>
        </div>
        <p className="text-xs text-orange-700/90 leading-relaxed">
          Este producto no tiene una receta definida. Para controlar tu stock y costos, carga los insumos.
        </p>
      </div>
    );
  }

  if (estadoCosteo === "actualizado") {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-md bg-green-50 text-green-700 border border-green-200 w-fit">
        <CheckCircle2 className="w-4 h-4" />
        <span>Costeo al da</span>
      </div>
    );
  }

  const factorSugerido = 1 + margenMetaSugerido / 100;
  const precioSugerido = costoTotalCalculado * factorSugerido;

  return (
    <div className="flex flex-col gap-2 p-3 text-sm rounded-lg bg-yellow-50 text-yellow-800 border border-yellow-300 w-full max-w-sm">
      <div className="flex items-center gap-1.5 font-semibold text-yellow-700">
        <AlertCircle className="w-4 h-4" />
        <span>Insumos encarecidos</span>
      </div>
      <p className="text-xs text-yellow-700/90 leading-relaxed">
        El costo de produccin aument. Te sugerimos ajustar el precio para mantener tu margen meta del {margenMetaSugerido}%.
      </p>

      <div className="flex items-center justify-between mt-1 pt-2 border-t border-yellow-200/50">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider font-bold text-yellow-600/80">
            Sugerido
          </span>
          <span className="font-bold text-yellow-900">
            ${formatearMascaraMoneda(Math.ceil(precioSugerido))}
          </span>
        </div>

        {onRecalcularSugerencia && (
          <button
            type="button"
            onClick={() => onRecalcularSugerencia(Math.ceil(precioSugerido))}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-yellow-100 text-yellow-800 border border-yellow-400/60 hover:bg-yellow-200 hover:text-yellow-900 transition-colors shadow-sm"
          >
            Recalcular Sugerencia
          </button>
        )}
      </div>
    </div>
  );
}
