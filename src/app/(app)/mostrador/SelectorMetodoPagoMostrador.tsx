"use client";

import {
  Banknote,
  Building2,
  CreditCard,
  UserCheck,
  Smartphone,
} from "lucide-react";
import type { ReglaMetodoPago } from "@/lib/dominio/ventas/calcularTotalVenta";

interface SelectorMetodoPagoMostradorProps {
  metodos: ReglaMetodoPago[];
  metodoSeleccionado: string;
  onSeleccionarMetodo: (metodo: string) => void;
}

function obtenerIconoMetodo(metodoPago: string) {
  switch (metodoPago) {
    case "efectivo":
      return <Banknote className="h-4 w-4 text-emerald-400" />;
    case "transferencia":
      return <Building2 className="h-4 w-4 text-blue-400" />;
    case "debito":
      return <CreditCard className="h-4 w-4 text-sky-400" />;
    case "credito":
      return <CreditCard className="h-4 w-4 text-purple-400" />;
    case "cuenta_corriente":
      return <UserCheck className="h-4 w-4 text-amber-400" />;
    default:
      return <Smartphone className="h-4 w-4 text-slate-400" />;
  }
}

export function SelectorMetodoPagoMostrador({
  metodos,
  metodoSeleccionado,
  onSeleccionarMetodo,
}: SelectorMetodoPagoMostradorProps) {
  const metodosActivos = metodos.filter((m) => m.activo);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Método de Pago (1 - 5)
      </label>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {metodosActivos.map((metodo, index) => {
          const esActivo = metodo.metodoPago === metodoSeleccionado;
          const numeroAtajo = index + 1;

          return (
            <button
              key={metodo.metodoPago}
              type="button"
              onClick={() => onSeleccionarMetodo(metodo.metodoPago)}
              className={`flex min-h-11 items-center justify-between gap-2 rounded-md border p-2.5 text-left transition-all ${
                esActivo
                  ? "border-emerald-500 bg-[#151A18] text-slate-50 ring-1 ring-emerald-500/40"
                  : "border-[#222A27] bg-[#111615] text-slate-300 hover:border-slate-600 hover:text-slate-100"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0">{obtenerIconoMetodo(metodo.metodoPago)}</span>
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-xs font-semibold">{metodo.etiqueta}</span>
                  {metodo.tipoAjuste === "descuento" && metodo.porcentaje > 0 ? (
                    <span className="font-mono text-[10px] text-emerald-400">
                      -{metodo.porcentaje}% dto
                    </span>
                  ) : metodo.tipoAjuste === "recargo" && metodo.porcentaje > 0 ? (
                    <span className="font-mono text-[10px] text-purple-400">
                      +{metodo.porcentaje}% rec
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Sin recargo</span>
                  )}
                </div>
              </div>

              {numeroAtajo <= 9 ? (
                <kbd className="shrink-0 rounded border border-[#222A27] bg-[#1a211f] px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                  {numeroAtajo}
                </kbd>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
