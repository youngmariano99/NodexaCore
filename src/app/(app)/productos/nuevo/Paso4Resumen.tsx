import { CheckCircle2, PackageSearch } from "lucide-react";
import type { VarianteMatriz } from "./FormularioAltaProductoWizard";

interface Paso4ResumenProps {
  sku: string;
  nombre: string;
  categoria: string;
  precio: number;
  imagenPrevisualizacion: string | null;
  matrizVariantes: VarianteMatriz[];
  alCargarOtro: () => void;
  alFinalizar: () => void;
  estaEnviando: boolean;
}

export function Paso4Resumen({
  sku,
  nombre,
  categoria,
  precio,
  imagenPrevisualizacion,
  matrizVariantes,
  alCargarOtro,
  alFinalizar,
  estaEnviando,
}: Paso4ResumenProps) {
  return (
    <div className="flex w-full flex-col gap-6 rounded-lg bg-[#111615] border border-[#222A27] p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#16D39A]/10">
          <CheckCircle2 className="h-6 w-6 text-[#16D39A]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-50">Resumen del Producto</h3>
          <p className="text-sm text-slate-400">Verificá los datos antes de guardarlo en tu catálogo.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-md bg-[#0D1110] p-4 border border-[#222A27]/50">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#222A27] bg-[#111615]">
            {imagenPrevisualizacion ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagenPrevisualizacion} alt={nombre} className="h-full w-full object-cover" />
            ) : (
              <PackageSearch className="h-8 w-8 text-slate-500" />
            )}
          </div>
          <div className="flex flex-1 flex-col justify-center gap-2">
            <h4 className="text-xl font-bold text-slate-50">{nombre || "Sin nombre"}</h4>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="flex flex-col">
                <span className="text-xs text-slate-500">SKU</span>
                <span className="text-sm font-medium text-slate-300">{sku || "-"}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-500">Categoría</span>
                <span className="text-sm font-medium text-slate-300">{categoria || "-"}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-500">Precio Base</span>
                <span className="text-sm font-medium text-[#16D39A]">${precio.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {matrizVariantes.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">Variantes generadas ({matrizVariantes.length})</span>
          <div className="max-h-40 overflow-y-auto rounded-md border border-[#222A27] bg-[#0D1110] p-3 text-sm text-slate-300">
            <ul className="flex flex-col gap-2">
              {matrizVariantes.slice(0, 5).map((v) => (
                <li key={v.sku} className="flex justify-between items-center bg-[#111615] p-2 rounded border border-[#222A27]/50">
                  <span>{Object.values(v.combinacion).join(" / ")}</span>
                  <div className="flex gap-4">
                    <span className="text-slate-400">Stock: {v.stock}</span>
                    <span className="text-[#16D39A]">${v.precio.toFixed(2)}</span>
                  </div>
                </li>
              ))}
              {matrizVariantes.length > 5 && (
                <li className="text-center text-xs text-slate-500 pt-2">
                  + {matrizVariantes.length - 5} variantes más...
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-end gap-4 mt-2">
        <button
          onClick={alFinalizar}
          disabled={estaEnviando}
          className="flex min-h-11 items-center justify-center rounded-md border border-[#222A27] bg-transparent px-5 text-sm font-semibold text-slate-300 transition-colors duration-150 hover:bg-white/5 disabled:opacity-50"
        >
          {estaEnviando ? "Guardando..." : "Guardar y finalizar"}
        </button>
        <button
          onClick={alCargarOtro}
          disabled={estaEnviando}
          className="flex min-h-11 items-center justify-center rounded-md bg-[#16D39A] px-5 text-sm font-semibold text-[#090B0B] transition-colors duration-150 hover:bg-[#16D39A]/90 disabled:opacity-50"
        >
          {estaEnviando ? "Guardando..." : "Guardar y cargar otro"}
        </button>
      </div>
    </div>
  );
}
