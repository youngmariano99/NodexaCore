"use client";

import { Upload, X, HelpCircle } from "lucide-react";

interface Paso1DatosGeneralesProps {
  sku: string;
  setSku: (v: string) => void;
  nombre: string;
  setNombre: (v: string) => void;
  categoria: string;
  setCategoria: (v: string) => void;
  precio: number;
  setPrecio: (v: number) => void;
  catalogoWebActivo: boolean;
  imagenPrevisualizacion: string | null;
  manejarImagen: (evento: React.ChangeEvent<HTMLInputElement>) => void;
  limpiarImagen: () => void;
  errores: Record<string, string>;
  guiasActivas: boolean;
  alSiguiente: () => void;
}

export function Paso1DatosGenerales({
  sku,
  setSku,
  nombre,
  setNombre,
  categoria,
  setCategoria,
  precio,
  setPrecio,
  catalogoWebActivo,
  imagenPrevisualizacion,
  manejarImagen,
  limpiarImagen,
  errores,
  guiasActivas,
  alSiguiente,
}: Paso1DatosGeneralesProps) {
  const CLASES_CAMPO_BASE =
    "min-h-11 w-full rounded-md border bg-[#111615] border-[#222A27] px-4 text-base text-slate-50 placeholder:text-slate-500 outline-none transition-colors duration-150 focus:border-[#16D39A]";

  return (
    <div className="flex flex-col gap-6">
      {guiasActivas && (
        <div className="bg-[#111615] border border-[#222A27] p-4 rounded-md text-sm text-slate-300 flex gap-2">
          <HelpCircle className="h-5 w-5 text-[#16D39A] shrink-0" />
          <p>
            <strong>Consejo:</strong> Cargá un SKU único y descriptivo para el producto. El <strong>Precio base</strong> servirá como referencia para las variantes que generes en el último paso.
          </p>
        </div>
      )}

      {catalogoWebActivo && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">Foto Principal</span>
          <label className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-[#222A27] bg-[#111615] hover:border-[#16D39A]/60 transition-colors duration-150">
            {imagenPrevisualizacion ? (
              <div className="relative h-28 w-28 overflow-hidden rounded-md border border-[#222A27]">
                <img src={imagenPrevisualizacion} alt="Previsualización" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    limpiarImagen();
                  }}
                  className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-slate-400" />
                <span className="text-sm text-slate-400">Subí una foto nítida de tu producto</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={manejarImagen} />
          </label>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="sku" className="text-sm font-medium text-slate-300">SKU</label>
        <input
          id="sku"
          type="text"
          placeholder="ej. HEL-1KG-001"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          className={CLASES_CAMPO_BASE}
        />
        {errores.sku && <span className="text-xs text-red-500">{errores.sku}</span>}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="nombre" className="text-sm font-medium text-slate-300">Nombre</label>
        <input
          id="nombre"
          type="text"
          placeholder="ej. Helado Premium"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className={CLASES_CAMPO_BASE}
        />
        {errores.nombre && <span className="text-xs text-red-500">{errores.nombre}</span>}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="categoria" className="text-sm font-medium text-slate-300">Categoría</label>
        <input
          id="categoria"
          type="text"
          placeholder="ej. Helados"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className={CLASES_CAMPO_BASE}
        />
        {errores.categoria && <span className="text-xs text-red-500">{errores.categoria}</span>}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="precio" className="text-sm font-medium text-slate-300">Precio base ($)</label>
        <input
          id="precio"
          type="number"
          min="0"
          placeholder="ej. 8500"
          value={precio || ""}
          onChange={(e) => setPrecio(Number(e.target.value))}
          className={CLASES_CAMPO_BASE}
        />
        {errores.precio && <span className="text-xs text-red-500">{errores.precio}</span>}
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={alSiguiente}
          className="flex min-h-11 items-center gap-2 rounded-md bg-[#16D39A] px-5 text-sm font-semibold text-[#090B0B] transition-colors duration-150 hover:bg-[#16D39A]/90"
        >
          Siguiente: Dimensiones
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ChevronRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
