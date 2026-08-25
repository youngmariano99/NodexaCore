"use client";

import { Check } from "lucide-react";
import { useActionState, useState } from "react";

import { MensajeError } from "@/components/errores/MensajeError";
import { actualizarIdentidadVisual } from "@/services/catalogoWeb/actualizarIdentidadVisual";
import { COLORES_PRIMARIOS_PERMITIDOS } from "@/services/catalogoWeb/coloresPrimariosPermitidos";
import { ESTADO_ACTUALIZAR_IDENTIDAD_VISUAL_INICIAL } from "@/services/catalogoWeb/tipos";

interface FormularioIdentidadVisualProps {
  logoUrlActual: string | null;
  colorPrimarioActual: string | null;
}

const COLOR_POR_DEFECTO = "#3B82F6";

/**
 * Formulario de personalización de la vidriera (docs/BACKLOG.md Paso 4:
 * "reflejar el cambio en la vista"). Los swatches de color son la única
 * forma de elegir `color_primario` — nunca un input de texto libre — así
 * que la paleta permitida (docs/DESIGN.md §5) queda garantizada también del
 * lado del cliente, no solo por el `NX-SYS-006` del servidor. Cada swatch
 * cumple el área táctil mínima de 44x44px (`min-h-11 min-w-11`,
 * docs/DESIGN.md `min-touch-target`).
 */
export function FormularioIdentidadVisual({ logoUrlActual, colorPrimarioActual }: FormularioIdentidadVisualProps) {
  const [estado, accionFormulario, estaEnviando] = useActionState(
    actualizarIdentidadVisual,
    ESTADO_ACTUALIZAR_IDENTIDAD_VISUAL_INICIAL,
  );
  const [colorSeleccionado, setColorSeleccionado] = useState(colorPrimarioActual ?? COLOR_POR_DEFECTO);

  return (
    <form action={accionFormulario} className="flex w-full max-w-md flex-col gap-6">
      <input type="hidden" name="color_primario" value={colorSeleccionado} readOnly />

      <div className="flex flex-col gap-2">
        <label htmlFor="logo_url" className="text-sm font-medium text-slate-50">
          URL del logo
        </label>
        <input
          id="logo_url"
          name="logo_url"
          type="url"
          defaultValue={logoUrlActual ?? ""}
          placeholder="ej. https://cdn.nodexa.app/logos/mi-comercio.webp"
          className="min-h-11 rounded-md border border-[#222A27] bg-slate-700 px-4 text-base text-slate-50 placeholder:text-slate-400 outline-none transition-colors duration-150 focus:border-blue-500"
        />
        <p className="text-xs text-slate-400">Dejalo vacío para quitar el logo de tu vidriera.</p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-50">Color principal</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color principal de la vidriera">
          {COLORES_PRIMARIOS_PERMITIDOS.map((color) => {
            const seleccionado = color === colorSeleccionado;

            return (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={seleccionado}
                aria-label={color}
                onClick={() => setColorSeleccionado(color)}
                style={{ backgroundColor: color }}
                className={`flex min-h-11 min-w-11 items-center justify-center rounded-md border-2 transition-colors duration-150 ${
                  seleccionado ? "border-slate-50" : "border-transparent hover:border-slate-400"
                }`}
              >
                {seleccionado ? <Check className="h-4 w-4 text-slate-950" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-400">
          Paleta curada por NODEXA: nunca incluye púrpura, violeta ni índigo.
        </p>
      </div>

      <MensajeError codigo={estado.error} />

      {estado.exito ? (
        <p role="status" className="text-sm text-emerald-500">
          Identidad visual actualizada.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={estaEnviando}
        className="min-h-11 rounded-md bg-[#16D39A] px-4 text-base font-semibold text-[#090B0B] transition-colors duration-150 hover:bg-[#16D39A]/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {estaEnviando ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
