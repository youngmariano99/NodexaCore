"use client";

import { Upload, X } from "lucide-react";
import { useState, type ChangeEvent } from "react";

interface SubidorImagenProps {
  label: string;
  imagenUrlActual?: string | null;
  onImagenCargada: (url: string) => void;
  onImagenEliminada?: () => void;
  ayudaText?: string;
}

export function SubidorImagen({
  label,
  imagenUrlActual,
  onImagenCargada,
  onImagenEliminada,
  ayudaText = "Formatos soportados: WebP, PNG, JPG (máx. 5 MB)",
}: SubidorImagenProps) {
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(imagenUrlActual ?? null);
  const [estaCargando, setEstaCargando] = useState(false);

  const manejarSeleccionArchivo = (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setEstaCargando(true);

    const reader = new FileReader();
    reader.onloadend = () => {
      const resultadoDataUrl = reader.result as string;
      setVistaPrevia(resultadoDataUrl);
      onImagenCargada(resultadoDataUrl);
      setEstaCargando(false);
    };
    reader.readAsDataURL(archivo);
  };

  const manejarEliminar = () => {
    setVistaPrevia(null);
    if (onImagenEliminada) {
      onImagenEliminada();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-100">{label}</label>

      {vistaPrevia ? (
        <div className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={vistaPrevia} alt="Previsualización" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={manejarEliminar}
            className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/80 text-slate-200 transition-colors hover:bg-red-600 hover:text-white"
            title="Quitar imagen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex min-h-28 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-700 bg-slate-900/60 p-4 transition-colors hover:border-[#16D39A] hover:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-400">
            <Upload className="h-5 w-5 text-[#16D39A]" />
            <span className="text-sm font-medium text-slate-200">
              {estaCargando ? "Procesando..." : "Subir imagen a Cloudinary"}
            </span>
          </div>
          <p className="text-xs text-slate-400">{ayudaText}</p>
          <input
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={manejarSeleccionArchivo}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}
