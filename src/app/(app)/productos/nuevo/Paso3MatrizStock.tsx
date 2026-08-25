"use client";

import Link from "next/link";
import { Check, HelpCircle } from "lucide-react";

interface VarianteMatriz {
  combinacion: Record<string, string>;
  sku: string;
  stock: number;
  precio: number;
}

interface Paso3MatrizStockProps {
  matrizVariantes: VarianteMatriz[];
  setMatrizVariantes: (v: VarianteMatriz[]) => void;
  errorServidor: string | null;
  exito: boolean;
  estaEnviando: boolean;
  guiasActivas: boolean;
  alAtras: () => void;
  guardar: () => void;
}

export function Paso3MatrizStock({
  matrizVariantes,
  setMatrizVariantes,
  errorServidor,
  exito,
  estaEnviando,
  guiasActivas,
  alAtras,
  guardar,
}: Paso3MatrizStockProps) {
  return (
    <div className="flex flex-col gap-6">
      {guiasActivas && (
        <div className="bg-[#111615] border border-[#222A27] p-4 rounded-md text-sm text-slate-300 flex gap-2">
          <HelpCircle className="h-5 w-5 text-[#16D39A] shrink-0" />
          <p>
            <strong>Consejo:</strong> Paso final! Completá la cantidad disponible (stock) y confirmá el SKU de cada combinación generada automáticamente. Dejá en 0 si no tenés unidades listas.
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-[#222A27] bg-[#0D1110]">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#222A27] text-slate-400 bg-[#111615]">
              <th className="px-4 py-3 font-semibold">Variación</th>
              <th className="px-4 py-3 font-semibold">SKU</th>
              <th className="px-4 py-3 font-semibold">Stock</th>
              <th className="px-4 py-3 font-semibold">Precio ($)</th>
            </tr>
          </thead>
          <tbody>
            {matrizVariantes.map((item, idx) => (
              <tr key={idx} className="border-b border-[#222A27] hover:bg-[#111615]/30">
                <td className="px-4 py-3 font-medium text-slate-200">
                  {Object.keys(item.combinacion).length > 0
                    ? Object.entries(item.combinacion)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" / ")
                    : "Producto único"}
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={item.sku}
                    onChange={(e) => {
                      const nueva = [...matrizVariantes];
                      const itemFila = nueva[idx];
                      if (itemFila) {
                        itemFila.sku = e.target.value;
                        setMatrizVariantes(nueva);
                      }
                    }}
                    className="rounded-md border bg-[#111615] border-[#222A27] px-2 py-1 text-sm text-slate-50 focus:border-[#16D39A]"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    value={item.stock}
                    onChange={(e) => {
                      const nueva = [...matrizVariantes];
                      const itemFila = nueva[idx];
                      if (itemFila) {
                        itemFila.stock = Math.max(0, Number(e.target.value));
                        setMatrizVariantes(nueva);
                      }
                    }}
                    className="w-20 rounded-md border bg-[#111615] border-[#222A27] px-2 py-1 text-sm text-slate-50 focus:border-[#16D39A]"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    value={item.precio}
                    onChange={(e) => {
                      const nueva = [...matrizVariantes];
                      const itemFila = nueva[idx];
                      if (itemFila) {
                        itemFila.precio = Math.max(0, Number(e.target.value));
                        setMatrizVariantes(nueva);
                      }
                    }}
                    className="w-24 rounded-md border bg-[#111615] border-[#222A27] px-2 py-1 text-sm text-slate-50 focus:border-[#16D39A]"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {errorServidor && <div className="text-sm text-red-500">Error: {errorServidor}</div>}

      {exito && (
        <div className="flex items-center gap-2 text-sm text-[#16D39A]">
          <Check className="h-5 w-5" />
          <span>¡Producto y variantes creadas con éxito!</span>
        </div>
      )}

      <div className="flex justify-between mt-4">
        <button
          onClick={alAtras}
          disabled={estaEnviando || exito}
          className="flex min-h-11 items-center gap-2 rounded-md border border-[#222A27] bg-[#111615] px-5 text-sm font-semibold text-slate-300"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Atrás
        </button>

        {exito ? (
          <Link
            href="/productos"
            className="flex min-h-11 items-center gap-2 rounded-md bg-[#16D39A] px-5 text-sm font-semibold text-[#090B0B]"
          >
            Volver al Listado
          </Link>
        ) : (
          <button
            onClick={guardar}
            disabled={estaEnviando}
            className="flex min-h-11 items-center gap-2 rounded-md bg-[#16D39A] px-5 text-sm font-semibold text-[#090B0B] hover:bg-[#16D39A]/90 disabled:opacity-50"
          >
            {estaEnviando ? "Guardando..." : "Guardar Producto"}
          </button>
        )}
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
