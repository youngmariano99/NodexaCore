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
 * Error Boundary de Next.js para el grupo (admin) â€” Administrador NODEXA,
 * independiente del boundary de (app): un error en /admin nunca tira abajo
 * el panel del comerciante ni viceversa (cada `error.tsx` de App Router
 * aÃ­sla su propio segmento). En producciÃ³n, Next.js ya reemplaza el mensaje
 * real de una excepciÃ³n lanzada en Server Components/Actions por uno
 * genÃ©rico con `digest` (nunca llega acÃ¡ una traza de SQL ni nombres de
 * columna); por eso nunca se renderiza `error.message` en la UI, siempre el
 * mensaje normalizado NX-SYS-001 (docs/ERRORS.md) vÃ­a `MensajeError`, nunca
 * un alert nativo del navegador.
 */
export default function ErrorBoundaryAdmin({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    if (error.message.includes('was not found on the server') || error.message.includes('UnrecognizedActionError')) { window.location.reload(); return; }
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-[#090B0B] px-6 text-center">
      <MensajeError codigo="NX-SYS-001" className="max-w-md" />
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-md bg-[#16D39A] px-4 text-base font-semibold text-slate-950 transition-colors duration-150 hover:bg-[#14be8b]"
        >
          Reintentar
        </button>
        <Link
          href="/admin/clientes"
          className="inline-flex min-h-11 items-center rounded-md border border-[#222A27] bg-[#111615] px-4 text-base text-slate-50 transition-colors duration-150 hover:border-[#16D39A] hover:text-[#16D39A]"
        >
          Volver al listado de comercios
        </Link>
      </div>
    </div>
  );
}


