"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

import { MensajeError } from "@/components/errores/MensajeError";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error Boundary de Next.js para el grupo (app) — comerciante/empleado
 * (dashboard, mostrador, productos, ventas, etc.), independiente del
 * boundary de (admin): un error acá nunca tira abajo el panel de
 * Administrador NODEXA ni viceversa (cada `error.tsx` de App Router aísla su
 * propio segmento). En producción, Next.js ya reemplaza el mensaje real de
 * una excepción lanzada en Server Components/Actions por uno genérico con
 * `digest` (nunca llega acá una traza de SQL ni nombres de columna); por eso
 * nunca se renderiza `error.message` en la UI, siempre el mensaje
 * normalizado NX-SYS-001 (docs/ERRORS.md) vía `MensajeError`, nunca un
 * alert nativo del navegador.
 */
export default function ErrorBoundaryApp({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center">
      <MensajeError codigo="NX-SYS-001" className="max-w-md" />
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-md bg-blue-500 px-4 text-base font-medium text-slate-50 transition-colors duration-150 hover:bg-blue-500/90"
        >
          Reintentar
        </button>
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center rounded-md border border-slate-700 px-4 text-base text-slate-50 transition-colors duration-150 hover:border-blue-500"
        >
          Volver al panel
        </Link>
      </div>
    </div>
  );
}
