import React from "react";
import Image from "next/image";

export function WatermarkNodexa() {
  return (
    <a
      href="https://nodexa.com.ar"
      target="_blank"
      rel="noopener noreferrer"
      title="Creá tu propio catálogo con Nodexa"
      className="group fixed bottom-6 right-6 z-50 flex items-center justify-center gap-1.5 rounded-full border border-slate-800/60 bg-slate-950/60 p-2.5 opacity-60 shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-[#16D39A]/50 hover:bg-slate-900/90 hover:opacity-100 hover:shadow-[#16D39A]/10"
      aria-label="Sitio impulsado por Nodexa"
    >
      <div className="relative h-5 w-5 drop-shadow-md grayscale transition-all duration-300 group-hover:grayscale-0">
        <Image
          src="/Isotipo.png"
          alt="Nodexa"
          fill
          sizes="20px"
          className="object-contain"
        />
      </div>
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-bold tracking-wide text-slate-100 transition-all duration-300 group-hover:max-w-[100px] group-hover:pr-1">
        Nodexa
      </span>
    </a>
  );
}
