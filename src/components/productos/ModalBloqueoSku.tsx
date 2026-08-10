"use client";

import { PackagePlus } from "lucide-react";
import Link from "next/link";

import { obtenerMensajeError } from "@/lib/errores/catalogo";

interface ModalBloqueoSkuProps {
  abierto: boolean;
  onCerrar: () => void;
}

/**
 * Modal de bloqueo al alcanzar el 100% de `limite_sku` (docs/ERRORS.md
 * `NX-PRD-001`, docs/DESIGN.md §4: "modal de bloqueo empático con acento
 * `text-blue-500`... nunca en tono punitivo o rojo"). A diferencia de
 * `MensajeError` (rojo, para fallas de validación), este modal comunica un
 * límite de plan alcanzable con una acción positiva — nunca usa
 * `border-red-500` ni un ícono de alerta.
 */
export function ModalBloqueoSku({ abierto, onCerrar }: ModalBloqueoSkuProps) {
  if (!abierto) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-bloqueo-sku-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4"
    >
      <div className="flex w-full max-w-md flex-col gap-4 rounded-md border border-slate-700 bg-slate-800 p-6">
        <div className="flex items-center gap-3 text-blue-500">
          <PackagePlus className="h-6 w-6 shrink-0" aria-hidden="true" />
          <h2 id="modal-bloqueo-sku-titulo" className="text-lg font-semibold text-slate-50">
            Llegaste al límite de tu catálogo
          </h2>
        </div>

        <p className="text-sm text-slate-400">{obtenerMensajeError("NX-PRD-001")}</p>

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
            Ampliar catálogo
          </Link>
        </div>
      </div>
    </div>
  );
}
