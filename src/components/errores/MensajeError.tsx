import { AlertCircle } from "lucide-react";

import { obtenerMensajeError } from "@/lib/errores/catalogo";

interface MensajeErrorProps {
  codigo?: string | null;
  className?: string;
}

/**
 * Presentación normalizada de un error de negocio (docs/DESIGN.md
 * "Formularios Fail-Fast": ícono `AlertCircle` + borde `border-red-500` +
 * texto explicativo — nunca alerts nativos del navegador, nunca solo color).
 * Sin estado ni hooks: se puede usar tanto en formularios cliente
 * (`useActionState`) como en estados de error de Server Components.
 */
export function MensajeError({ codigo, className = "" }: MensajeErrorProps) {
  if (!codigo) {
    return null;
  }

  return (
    <div
      role="alert"
      className={`flex items-start gap-2 rounded-md border border-red-500 bg-red-500/10 px-4 py-3 text-sm text-red-500 ${className}`}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{obtenerMensajeError(codigo)}</span>
    </div>
  );
}
