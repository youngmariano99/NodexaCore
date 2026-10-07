"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

import { MensajeError } from "@/components/errores/MensajeError";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundaryPublico({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    if (error.message.includes('was not found on the server') || error.message.includes('UnrecognizedActionError')) { 
      window.location.reload(); 
      return; 
    }
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-[#090B0B] px-6 text-center min-h-screen">
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
          href="/login"
          className="inline-flex min-h-11 items-center rounded-md border border-[#222A27] bg-[#111615] px-4 text-base text-slate-50 transition-colors duration-150 hover:border-[#16D39A] hover:text-[#16D39A]"
        >
          Ir a Iniciar Sesin
        </Link>
      </div>
    </div>
  );
}
