"use client";

import React from "react";
import { Search, X } from "lucide-react";

interface FiltroInteligenteProps {
  terminoBusqueda: string;
  alCambiarBusqueda: (termino: string) => void;
  placeholder?: string;
  colorPrimario: string;
}

export function FiltroInteligente({
  terminoBusqueda,
  alCambiarBusqueda,
  placeholder = "Buscar productos...",
  colorPrimario,
}: FiltroInteligenteProps) {
  return (
    <div
      className="relative mx-auto mb-8 w-full max-w-md"
      style={{ "--color-primario": colorPrimario } as React.CSSProperties}
    >
      <div className="relative flex items-center">
        <Search className="absolute left-4 h-5 w-5 text-slate-500" />
        <input
          type="text"
          value={terminoBusqueda}
          onChange={(e) => alCambiarBusqueda(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-full border border-slate-800 bg-slate-900/50 py-3 pl-12 pr-12 text-sm text-slate-100 placeholder:text-slate-500 shadow-sm transition-all focus:border-[var(--color-primario)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primario)]"
        />
        {terminoBusqueda.length > 0 && (
          <button
            onClick={() => alCambiarBusqueda("")}
            className="absolute right-4 rounded-full p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300 focus:outline-none"
            aria-label="Limpiar búsqueda"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
