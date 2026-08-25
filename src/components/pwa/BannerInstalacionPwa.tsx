"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function BannerInstalacionPwa() {
  const [eventoInstalacion, setEventoInstalacion] = useState<BeforeInstallPromptEvent | null>(null);
  const [mostrarBanner, setMostrarBanner] = useState(false);

  useEffect(() => {
    // Registrar el Service Worker en cliente
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() => {
          // Fallback silencioso si el navegador deshabilita service workers
        });
    }

    const capturarPromptInstalacion = (e: Event) => {
      e.preventDefault();
      setEventoInstalacion(e as BeforeInstallPromptEvent);

      const omitido = localStorage.getItem("nodexa_pwa_banner_dismissed");
      if (!omitido) {
        setMostrarBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", capturarPromptInstalacion);

    return () => {
      window.removeEventListener("beforeinstallprompt", capturarPromptInstalacion);
    };
  }, []);

  const instarlarApp = async () => {
    if (!eventoInstalacion) return;
    await eventoInstalacion.prompt();
    const { outcome } = await eventoInstalacion.userChoice;
    if (outcome === "accepted") {
      setMostrarBanner(false);
    }
  };

  const descartarBanner = () => {
    setMostrarBanner(false);
    localStorage.setItem("nodexa_pwa_banner_dismissed", "true");
  };

  if (!mostrarBanner || !eventoInstalacion) {
    return null;
  }

  return (
    <div
      role="banner"
      aria-label="Banner de instalación de la aplicación"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900/95 p-4 text-slate-100 shadow-2xl backdrop-blur-md"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#16D39A]/10 text-[#16D39A]">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-slate-50">Instalar App del Comercio</span>
          <span className="text-xs text-slate-400">Acceso directo rápido y compras offline.</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={instarlarApp}
          className="flex min-h-11 items-center justify-center rounded-lg bg-[#16D39A] px-3 text-xs font-bold text-slate-950 transition-colors hover:bg-[#16D39A]/90"
        >
          Instalar
        </button>
        <button
          type="button"
          onClick={descartarBanner}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          title="Descartar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
