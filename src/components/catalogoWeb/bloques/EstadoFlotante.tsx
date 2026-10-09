"use client";

import React from "react";
import { Clock, Store } from "lucide-react";

interface EstadoFlotanteProps {
  abierto: boolean;
  horarios?: string | null;
}

export function EstadoFlotante({ abierto, horarios }: EstadoFlotanteProps) {
  return (
    <div className="fixed bottom-6 left-6 z-50 flex max-w-[200px] flex-col gap-2 drop-shadow-xl">
      <div
        className={`flex items-center gap-2 rounded-full px-4 py-2 font-semibold shadow-lg backdrop-blur-md transition-colors ${
          abierto
            ? "border border-[#16D39A]/30 bg-slate-950/80 text-[#16D39A]"
            : "border border-red-500/30 bg-slate-950/80 text-red-400"
        }`}
      >
        <Store className="h-4 w-4" />
        <span className="text-sm tracking-wide">
          {abierto ? "ABIERTO" : "CERRADO"}
        </span>
      </div>

      {horarios && (
        <div className="flex w-max items-center gap-1.5 rounded-lg border border-slate-800/60 bg-slate-950/80 px-3 py-1.5 opacity-80 backdrop-blur-md">
          <Clock className="h-3 w-3 text-slate-400" />
          <span className="text-[11px] font-medium text-slate-300">
            {horarios}
          </span>
        </div>
      )}
    </div>
  );
}
