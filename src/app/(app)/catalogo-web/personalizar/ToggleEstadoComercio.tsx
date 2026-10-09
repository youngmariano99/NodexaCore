"use client";

import { Power, PowerOff } from "lucide-react";
import { useEffect, useOptimistic, useTransition } from "react";
import { useFormState } from "react-dom";

import { alternarEstadoPedidos } from "@/services/configuracion/alternarEstadoPedidos";
import { useToast } from "@/components/ui/Toast";

interface ToggleEstadoComercioProps {
  estadoInicial: boolean;
}

export function ToggleEstadoComercio({ estadoInicial }: ToggleEstadoComercioProps) {
  const { toast: notificacion } = useToast();
  const [isPending, startTransition] = useTransition();

  const [estado, formAction] = useFormState(alternarEstadoPedidos, {
    error: null,
    exito: false,
    nuevoEstado: estadoInicial,
  });

  const [estaAceptandoOpt, setEstaAceptandoOpt] = useOptimistic<boolean, boolean>(
    estado.nuevoEstado ?? estadoInicial,
    (_estadoActual, nuevo) => nuevo
  );

  const manejarCambio = () => {
    const nuevoEstado = !estaAceptandoOpt;
    
    startTransition(() => {
      setEstaAceptandoOpt(nuevoEstado);
      const formData = new FormData();
      formData.set("aceptando_pedidos", String(nuevoEstado));
      formAction(formData);
    });
  };

  useEffect(() => {
    if (estado.exito) {
      notificacion.exito(
        estado.nuevoEstado
          ? "El comercio ahora está aceptando pedidos."
          : "El comercio ya no acepta pedidos."
      );
    } else if (estado.error) {
      notificacion.error("Ocurrió un error al cambiar el estado del comercio.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  return (
    <section className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-slate-100">Aceptar Pedidos Ahora</span>
        <span className="text-xs text-slate-400">
          {estaAceptandoOpt
            ? "Tu catálogo web está abierto y recibiendo pedidos."
            : "Tu catálogo está cerrado. Los clientes solo pueden ver el menú."}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={estaAceptandoOpt}
        disabled={isPending}
        onClick={manejarCambio}
        className={`flex min-h-11 min-w-14 items-center rounded-full p-1 transition-colors ${
          estaAceptandoOpt ? "bg-emerald-500 justify-end" : "bg-red-500 justify-start"
        } disabled:opacity-50`}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-slate-100 shadow-md">
          {estaAceptandoOpt ? (
            <Power className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <PowerOff className="h-3.5 w-3.5 text-red-500" />
          )}
        </span>
      </button>
    </section>
  );
}
