import { MensajeError } from "@/components/errores/MensajeError";

/**
 * 404 de la vidriera pública (docs/BACKLOG.md Paso 4, docs/ERRORS.md
 * `NX-WEB-004`: "Esta vidriera no está disponible en este momento" — mensaje
 * genérico, sin datos internos del comercio). Se dispara al llamar
 * `notFound()` en `page.tsx` cuando el `clienteSlug` no resuelve a ningún
 * comercio activo (no existe o está suspendido; ambos casos indistinguibles
 * a propósito).
 */
export default function VidrieraNoEncontrada() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-white px-6 py-24 text-center">
      <MensajeError codigo="NX-WEB-004" className="max-w-md" />
    </div>
  );
}
