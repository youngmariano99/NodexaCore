import React from "react";
import Image from "next/image";

interface CatalogoHeroProps {
  titulo: string;
  subtitulo?: string | null;
  imagenFondo?: string | null;
  colorPrimario: string;
}

export function CatalogoHero({
  titulo,
  subtitulo,
  imagenFondo,
  colorPrimario,
}: CatalogoHeroProps) {
  return (
    <header
      className="relative flex min-h-[300px] w-full flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-16 text-center sm:min-h-[400px]"
      style={
        {
          "--color-primario": colorPrimario,
        } as React.CSSProperties
      }
    >
      {imagenFondo ? (
        <div className="absolute inset-0 z-0">
          <Image
            src={imagenFondo}
            alt="Banner del comercio"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-50 transition-opacity duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-slate-900/20" />
        </div>
      ) : (
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900 to-slate-950" />
      )}

      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-4 px-4 sm:px-6">
        <h1 className="text-balance text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
          {titulo}
        </h1>

        {subtitulo ? (
          <p className="mt-4 max-w-2xl text-balance text-base font-medium text-slate-300 sm:text-lg">
            {subtitulo}
          </p>
        ) : null}

        <div
          className="mt-6 h-1 w-24 rounded-full sm:mt-8"
          style={{ backgroundColor: "var(--color-primario)" }}
          aria-hidden="true"
        />
      </div>
    </header>
  );
}
