"use client";

import { CircleCheck } from "lucide-react";

import { MensajeError } from "@/components/errores/MensajeError";
import type { EstadoConfirmarVenta } from "@/services/ventas/tipos";

interface ConfirmarCobroProps {
  idempotencyKey: string;
  clienteFinalId: string | null;
  items: string;
  total: number;
  carritoVacio: boolean;
  estado: EstadoConfirmarVenta;
  estaEnviando: boolean;
  accionFormulario: (formData: FormData) => void;
  formRef?: React.RefObject<HTMLFormElement | null>;
}

/**
 * Botón de cobro del Mostrador (docs/BACKLOG.md "Server Action
 * confirmarVenta con idempotency_key", Paso 4). Puramente presentacional:
 * `idempotencyKey`, el `useActionState` de `confirmarVenta` y la lógica de
 * "vaciar el carrito tras una venta exitosa" viven en el padre
 * (`BuscadorProductos.tsx`), que es quien realmente posee ese estado —
 * ajustar el estado de un componente PADRE durante el render de un HIJO no
 * es el patrón que React documenta para "ajustar estado durante el render"
 * (ese patrón es para que un componente ajuste su PROPIO estado); acá cada
 * pieza de estado se ajusta desde el componente que la posee.
 *
 * `estaEnviando` (de `useActionState` en el padre) deshabilita el botón
 * desde el instante del clic hasta que el servidor responde (Criterio de
 * Aceptación 3) — reintentar (doble clic, reintento de red) reenvía el
 * mismo `idempotencyKey` ya generado, nunca uno nuevo.
 */
export function ConfirmarCobro({
  idempotencyKey,
  clienteFinalId,
  items,
  total,
  carritoVacio,
  estado,
  estaEnviando,
  accionFormulario,
  formRef,
}: ConfirmarCobroProps) {
  return (
    <form ref={formRef} action={accionFormulario} className="flex flex-col gap-3">
      <input type="hidden" name="idempotency_key" value={idempotencyKey} readOnly />
      {clienteFinalId && (
        <input type="hidden" name="cliente_final_id" value={clienteFinalId} readOnly />
      )}
      <input type="hidden" name="items" value={items} readOnly />
      <input type="hidden" name="total" value={total} readOnly />

      {estado.error ? <MensajeError codigo={estado.error} /> : null}

      {estado.exito ? (
        <p role="status" className="flex items-center gap-2 text-sm text-emerald-500">
          <CircleCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          Venta confirmada.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={estaEnviando || carritoVacio}
        className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-emerald-500 px-4 text-base font-semibold text-slate-950 transition-colors duration-150 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {estaEnviando ? (
          "Confirmando..."
        ) : (
          <>
            <span>Confirmar cobro</span>
            {!carritoVacio && (
              <kbd className="rounded border border-emerald-700/50 bg-emerald-600/30 px-1.5 py-0.5 font-mono text-xs font-normal text-slate-950">
                ↵ Enter
              </kbd>
            )}
          </>
        )}
      </button>
    </form>
  );
}
