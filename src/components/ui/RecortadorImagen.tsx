"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Point, Area } from "react-easy-crop";
import { ZoomIn, ZoomOut, Check, X } from "lucide-react";

interface RecortadorImagenProps {
  imagenSrc: string;
  onCompletado: (imagenRecortada: Blob, urlPrevisualizacion: string) => void;
  onCancelar: () => void;
}

export function RecortadorImagen({ imagenSrc, onCompletado, onCancelar }: RecortadorImagenProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaRecortada, setAreaRecortada] = useState<Area | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setAreaRecortada(croppedAreaPixels);
  }, []);

  const crearImagenRecortada = async () => {
    if (!areaRecortada) return;

    try {
      const imagen = await cargarImagen(imagenSrc);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      // Un buen tamaño estándar para E-commerce es 800x800
      canvas.width = 800;
      canvas.height = 800;

      ctx.drawImage(
        imagen,
        areaRecortada.x,
        areaRecortada.y,
        areaRecortada.width,
        areaRecortada.height,
        0,
        0,
        800,
        800
      );

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const previewUrl = URL.createObjectURL(blob);
            onCompletado(blob, previewUrl);
          }
        },
        "image/jpeg",
        0.85
      );
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex w-full max-w-lg flex-col gap-4 rounded-lg bg-[#090B0B] border border-[#222A27] p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-50">Recortar y Ajustar Foto</h3>
          <button onClick={onCancelar} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative h-[400px] w-full overflow-hidden rounded-md bg-[#111615]">
          <Cropper
            image={imagenSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        <div className="flex items-center gap-4 px-2">
          <ZoomOut className="h-5 w-5 text-slate-400" />
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-lg bg-[#222A27]"
          />
          <ZoomIn className="h-5 w-5 text-slate-400" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-md border border-[#222A27] bg-transparent px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={crearImagenRecortada}
            className="flex items-center gap-2 rounded-md bg-[#16D39A] px-4 py-2 text-sm font-medium text-[#090B0B] transition-colors hover:bg-[#16D39A]/90"
          >
            <Check className="h-4 w-4" />
            Aplicar y Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

const cargarImagen = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const imagen = new Image();
    imagen.addEventListener("load", () => resolve(imagen));
    imagen.addEventListener("error", (error) => reject(error));
    imagen.src = url;
  });
