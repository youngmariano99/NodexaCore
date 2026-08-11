"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";

import { obtenerMensajeError } from "@/lib/errores/catalogo";

interface ModalCuotaAgotadaIaProps {
  abierto: boolean;
  onCerrar: () => void;
}

/**
 * Modal de cuota de IA agotada (docs/ERRORS.md `NX-IA-002`: "Mostrar modal
 * amigable ofreciendo paquete de recarga (+40 consultas)"). Mismo criterio
 * visual que `ModalBloqueoSku` (docs/DESIGN.md §4: acento `text-blue-500`,
 * nunca en tono punitivo o rojo — agotar la cuota del plan no es un error de
 * validación) para no introducir un segundo patrón de "modal de límite de
 * plan" en el repo.
 */
export function ModalCuotaAgotadaIa({ abierto, onCerrar }: ModalCuotaAgotadaIaProps) {
  if (!abierto) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-cuota-agotada-ia-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4"
    >
      <div className="flex w-full max-w-md flex-col gap-4 rounded-md border border-slate-700 bg-slate-800 p-6">
        <div className="flex items-center gap-3 text-blue-500">
          <Sparkles className="h-6 w-6 shrink-0" aria-hidden="true" />
          <h2 id="modal-cuota-agotada-ia-titulo" className="text-lg font-semibold text-slate-50">
            Ya usaste todas tus cargas por IA
          </h2>
        </div>

        <p className="text-sm text-slate-400">{obtenerMensajeError("NX-IA-002")}</p>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCerrar}
            className="min-h-11 rounded-md border border-slate-700 px-4 text-sm text-slate-50 transition-colors duration-150 hover:border-blue-500"
          >
            Ahora no
          </button>
          <Link
            href="/configuracion/modulos"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-blue-500 px-4 text-sm font-medium text-slate-50 transition-colors duration-150 hover:bg-blue-500/90"
          >
            Contratar paquete de recarga (+40 consultas)
          </Link>
        </div>
      </div>
    </div>
  );
}
