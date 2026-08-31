"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

export type TipoToast = "exito" | "error" | "advertencia" | "info";

export interface ToastItem {
  id: string;
  tipo: TipoToast;
  mensaje: string;
  titulo?: string;
}

interface ToastContextType {
  toast: {
    exito: (mensaje: string, titulo?: string) => void;
    error: (mensaje: string, titulo?: string) => void;
    advertencia: (mensaje: string, titulo?: string) => void;
    info: (mensaje: string, titulo?: string) => void;
  };
  removerToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removerToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const agregarToast = useCallback(
    (tipo: TipoToast, mensaje: string, titulo?: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, tipo, mensaje, titulo }]);

      // Auto dismiss
      setTimeout(() => {
        removerToast(id);
      }, 4500);
    },
    [removerToast]
  );

  const toast = {
    exito: useCallback((mensaje: string, titulo?: string) => agregarToast("exito", mensaje, titulo), [agregarToast]),
    error: useCallback((mensaje: string, titulo?: string) => agregarToast("error", mensaje, titulo), [agregarToast]),
    advertencia: useCallback((mensaje: string, titulo?: string) => agregarToast("advertencia", mensaje, titulo), [agregarToast]),
    info: useCallback((mensaje: string, titulo?: string) => agregarToast("info", mensaje, titulo), [agregarToast]),
  };

  return (
    <ToastContext.Provider value={{ toast, removerToast }}>
      {children}
      {/* Toast Container */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-[#222A27] bg-[#111615] p-4 shadow-2xl transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
          >
            {t.tipo === "exito" && <CheckCircle2 className="h-5 w-5 shrink-0 text-[#16D39A]" />}
            {t.tipo === "error" && <XCircle className="h-5 w-5 shrink-0 text-red-400" />}
            {t.tipo === "advertencia" && <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />}
            {t.tipo === "info" && <Info className="h-5 w-5 shrink-0 text-sky-400" />}

            <div className="flex-1 text-xs">
              {t.titulo && <p className="font-bold text-slate-100 mb-0.5">{t.titulo}</p>}
              <p className="text-slate-300 leading-relaxed">{t.mensaje}</p>
            </div>

            <button
              type="button"
              onClick={() => removerToast(t.id)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="Cerrar notificación"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe ser utilizado dentro de un ToastProvider");
  }
  return context;
}
