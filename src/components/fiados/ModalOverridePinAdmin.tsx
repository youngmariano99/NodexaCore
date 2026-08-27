"use client";

import { ShieldAlert, Lock, X } from "lucide-react";
import { useState } from "react";

interface ModalOverridePinAdminProps {
  abierto: boolean;
  nombreCliente: string;
  saldoActual: number;
  limiteCredito: number;
  totalVenta: number;
  onConfirmarPin: (pin: string) => void;
  onCancelar: () => void;
  errorPin?: string | null;
}

export function ModalOverridePinAdmin({
  abierto,
  nombreCliente,
  saldoActual,
  limiteCredito,
  totalVenta,
  onConfirmarPin,
  onCancelar,
  errorPin,
}: ModalOverridePinAdminProps) {
  const [pin, setPin] = useState("");

  if (!abierto) return null;

  const formatearPrecio = (monto: number) => {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(monto);
  };

  const nuevoTotal = saldoActual + totalVenta;
  const exceso = nuevoTotal - limiteCredito;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim()) {
      onConfirmarPin(pin.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-amber-400">
            <ShieldAlert className="h-5 w-5" />
            <h2 className="text-base font-bold">Autorización Excepcional de Crédito</h2>
          </div>
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-2 rounded-xl bg-slate-950 p-4 text-xs">
          <p className="text-slate-300">
            La venta a fiado para <span className="font-bold text-slate-50">{nombreCliente}</span> supera su límite de crédito configurado.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-2 text-2xs border-t border-slate-900 mt-1">
            <div>
              <span className="text-slate-500">Límite Permitido:</span>
              <p className="font-semibold text-slate-300">{formatearPrecio(limiteCredito)}</p>
            </div>
            <div>
              <span className="text-slate-500">Deuda Actual:</span>
              <p className="font-semibold text-amber-400">{formatearPrecio(saldoActual)}</p>
            </div>
            <div>
              <span className="text-slate-500">Nueva Venta:</span>
              <p className="font-semibold text-slate-100">{formatearPrecio(totalVenta)}</p>
            </div>
            <div>
              <span className="text-slate-500">Exceso a Autorizar:</span>
              <p className="font-bold text-red-400">{formatearPrecio(exceso)}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">
              PIN de Administrador / Dueño:
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Ingresá tu PIN para autorizar"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-slate-100 focus:border-amber-400 focus:outline-none"
              />
            </div>
            {errorPin && <span className="text-2xs text-red-400">{errorPin}</span>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancelar}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors"
            >
              Autorizar Exceso
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
