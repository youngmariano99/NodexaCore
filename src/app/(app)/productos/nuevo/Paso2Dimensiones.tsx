"use client";

import { Trash2, X, HelpCircle } from "lucide-react";

interface Dimension {
  id: string;
  nombre: string;
  valores: string[];
}

interface Paso2DimensionesProps {
  dimensiones: Dimension[];
  setDimensiones: (dims: Dimension[]) => void;
  nuevaDimensionNombre: string;
  setNuevaDimensionNombre: (v: string) => void;
  nuevoValorInputs: Record<string, string>;
  setNuevoValorInputs: (v: Record<string, string>) => void;
  errorPaso2: string | null;
  setErrorPaso2: (v: string | null) => void;
  guiasActivas: boolean;
  alAtras: () => void;
  alSiguiente: () => void;
}

export function Paso2Dimensiones({
  dimensiones,
  setDimensiones,
  nuevaDimensionNombre,
  setNuevaDimensionNombre,
  nuevoValorInputs,
  setNuevoValorInputs,
  errorPaso2,
  setErrorPaso2,
  guiasActivas,
  alAtras,
  alSiguiente,
}: Paso2DimensionesProps) {
  const CLASES_CAMPO_BASE =
    "min-h-11 w-full rounded-md border bg-[#111615] border-[#222A27] px-4 text-base text-slate-50 placeholder:text-slate-500 outline-none transition-colors duration-150 focus:border-[#16D39A]";

  const agregarDimension = (nombreDim: string) => {
    const nombreNormalizado = nombreDim.trim();
    if (!nombreNormalizado) return;

    if (dimensiones.some((d) => d.nombre.toLowerCase() === nombreNormalizado.toLowerCase())) {
      setErrorPaso2("Ya agregaste esa dimensión.");
      return;
    }

    setDimensiones([
      ...dimensiones,
      { id: Math.random().toString(36).substr(2, 9), nombre: nombreNormalizado, valores: [] },
    ]);
    setNuevaDimensionNombre("");
    setErrorPaso2(null);
  };

  const quitarDimension = (id: string) => {
    setDimensiones(dimensiones.filter((d) => d.id !== id));
  };

  const agregarValorADimension = (dimId: string) => {
    const valor = nuevoValorInputs[dimId]?.trim();
    if (!valor) return;

    setDimensiones(
      dimensiones.map((d) => {
        if (d.id === dimId) {
          if (d.valores.some((v) => v.toLowerCase() === valor.toLowerCase())) {
            return d;
          }
          return { ...d, valores: [...d.valores, valor] };
        }
        return d;
      })
    );

    setNuevoValorInputs({ ...nuevoValorInputs, [dimId]: "" });
  };

  const removerValorDeDimension = (dimId: string, valorIdx: number) => {
    setDimensiones(
      dimensiones.map((d) => {
        if (d.id === dimId) {
          return { ...d, valores: d.valores.filter((_, idx) => idx !== valorIdx) };
        }
        return d;
      })
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {guiasActivas && (
        <div className="bg-[#111615] border border-[#222A27] p-4 rounded-md text-sm text-slate-300 flex gap-2">
          <HelpCircle className="h-5 w-5 text-[#16D39A] shrink-0" />
          <p>
            <strong>Consejo:</strong> Definí las características que diferencian tus productos (ej. Talle, Color, Presentación). Podés usar las sugeridas abajo o escribir una nueva dimensión.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-xs text-slate-400">Sugerencias rápidas:</span>
        <div className="flex gap-2">
          <button
            onClick={() => agregarDimension("Talle")}
            className="rounded-md border border-[#222A27] bg-[#111615] px-3 py-1 text-xs text-slate-300 hover:border-[#16D39A]/40"
          >
            + Talle
          </button>
          <button
            onClick={() => agregarDimension("Color")}
            className="rounded-md border border-[#222A27] bg-[#111615] px-3 py-1 text-xs text-slate-300 hover:border-[#16D39A]/40"
          >
            + Color
          </button>
          <button
            onClick={() => agregarDimension("Presentación")}
            className="rounded-md border border-[#222A27] bg-[#111615] px-3 py-1 text-xs text-slate-300 hover:border-[#16D39A]/40"
          >
            + Presentación
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Nueva dimensión manual, ej: Sabor"
          value={nuevaDimensionNombre}
          onChange={(e) => setNuevaDimensionNombre(e.target.value)}
          className={CLASES_CAMPO_BASE}
        />
        <button
          onClick={() => agregarDimension(nuevaDimensionNombre)}
          className="flex min-h-11 items-center justify-center rounded-md bg-[#16D39A] px-4 font-semibold text-[#090B0B]"
        >
          Agregar
        </button>
      </div>

      {errorPaso2 && <div className="text-sm text-red-500">{errorPaso2}</div>}

      {dimensiones.map((dim) => (
        <div key={dim.id} className="flex flex-col gap-3 rounded-md border border-[#222A27] bg-[#0D1110] p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-200">Dimensión: {dim.nombre}</span>
            <button
              onClick={() => quitarDimension(dim.id)}
              className="text-slate-400 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {dim.valores.map((val, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-200 border border-[#222A27]"
              >
                {val}
                <button
                  type="button"
                  onClick={() => removerValorDeDimension(dim.id, idx)}
                  className="text-slate-400 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2 mt-2">
            <input
              type="text"
              placeholder="ej. Rojo, 1KG, Dulce de Leche..."
              value={nuevoValorInputs[dim.id] || ""}
              onChange={(e) => setNuevoValorInputs({ ...nuevoValorInputs, [dim.id]: e.target.value })}
              className="min-h-[38px] w-full rounded-md border bg-[#111615] border-[#222A27] px-3 text-sm text-slate-50 placeholder:text-slate-500 outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  agregarValorADimension(dim.id);
                }
              }}
            />
            <button
              onClick={() => agregarValorADimension(dim.id)}
              className="rounded-md border border-[#222A27] bg-slate-800 px-3 text-xs text-slate-200"
            >
              +
            </button>
          </div>
        </div>
      ))}

      <div className="flex justify-between mt-4">
        <button
          onClick={alAtras}
          className="flex min-h-11 items-center gap-2 rounded-md border border-[#222A27] bg-[#111615] px-5 text-sm font-semibold text-slate-300"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Atrás
        </button>

        <button
          onClick={alSiguiente}
          className="flex min-h-11 items-center gap-2 rounded-md bg-[#16D39A] px-5 text-sm font-semibold text-[#090B0B] hover:bg-[#16D39A]/90"
        >
          Siguiente: Matriz de Stock
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ChevronLeftIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="m15 18-6-6 6-6" />
    </svg>
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
