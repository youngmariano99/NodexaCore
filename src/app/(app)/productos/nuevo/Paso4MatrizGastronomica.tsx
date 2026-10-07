"use client";

import { Trash2, ChevronDown, ChevronRight, Settings2 } from "lucide-react";
import { useState } from "react";
import { VarianteMatriz } from "./FormularioAltaProductoWizard";
import { InsumoReceta } from "./Paso3RecetaBase";
import { BuscadorInsumos } from "./BuscadorInsumos";

interface VarianteGastronomica extends VarianteMatriz {
  insumosExtra?: InsumoReceta[];
  margenMeta?: number;
  precioOverride?: boolean;
}

interface Paso4MatrizGastronomicaProps {
  matrizVariantes: VarianteGastronomica[];
  setMatrizVariantes: React.Dispatch<React.SetStateAction<VarianteGastronomica[]>>;
  insumosBase: InsumoReceta[];
  rendimientoBase: number;
  precioBase: number;
  alAtras: () => void;
  alFinalizar: () => void;
  estaEnviando: boolean;
}

const CLASES_INPUT = "flex h-11 w-full rounded-md border border-[#222A27] bg-[#090B0B] px-3 py-2 text-sm text-[#F3F5F4] outline-none transition-colors placeholder:text-[#A6AEAA] focus:border-[#16D39A] focus:ring-1 focus:ring-[#16D39A] disabled:cursor-not-allowed disabled:opacity-50";

export function Paso4MatrizGastronomica({
  matrizVariantes,
  setMatrizVariantes,
  insumosBase,
  rendimientoBase,
  precioBase,
  alAtras,
  alFinalizar,
  estaEnviando,
}: Paso4MatrizGastronomicaProps) {
  const [varianteExpandida, setVarianteExpandida] = useState<string | null>(null);

  const costoBaseReceta = insumosBase.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
  const costoBaseUnitario = rendimientoBase > 0 ? costoBaseReceta / rendimientoBase : 0;

  const toggleExpandir = (sku: string) => {
    setVarianteExpandida(varianteExpandida === sku ? null : sku);
  };

  const agregarInsumoExtra = (skuVar: string, insumoNuevo: { producto_id: string; sku: string; nombre: string; precio: number }) => {
    setMatrizVariantes((prev) => 
      prev.map(v => {
        if (v.sku !== skuVar) return v;
        const extrasActuales = v.insumosExtra || [];
        if (extrasActuales.some(i => i.producto_id === insumoNuevo.producto_id)) return v;
        return {
          ...v,
          insumosExtra: [...extrasActuales, { ...insumoNuevo, cantidad: 1 }]
        };
      })
    );
  };

  const actualizarCantidadExtra = (skuVar: string, insumoId: string, cantidad: number) => {
    setMatrizVariantes(prev => 
      prev.map(v => {
        if (v.sku !== skuVar) return v;
        const extras = (v.insumosExtra || []).map(i => i.producto_id === insumoId ? { ...i, cantidad } : i);
        return { ...v, insumosExtra: extras };
      })
    );
  };

  const eliminarInsumoExtra = (skuVar: string, insumoId: string) => {
    setMatrizVariantes(prev => 
      prev.map(v => {
        if (v.sku !== skuVar) return v;
        const extras = (v.insumosExtra || []).filter(i => i.producto_id !== insumoId);
        return { ...v, insumosExtra: extras };
      })
    );
  };

  const actualizarPrecio = (skuVar: string, nuevoPrecio: number) => {
    setMatrizVariantes(prev =>
      prev.map(v => v.sku === skuVar ? { ...v, precio: nuevoPrecio, precioOverride: true } : v)
    );
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-[#F3F5F4]">Matriz de Variantes y Costos</h3>
        <p className="text-sm text-[#A6AEAA]">
          Costo Base (por unidad): <span className="font-semibold text-white">${costoBaseUnitario.toFixed(2)}</span>. 
          Ajustá el precio de venta o agregá insumos especficos para cada variante.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {matrizVariantes.map((variante) => {
          const costoExtra = (variante.insumosExtra || []).reduce((acc, i) => acc + i.precio * i.cantidad, 0);
          const costoTotal = costoBaseUnitario + costoExtra;
          
          let sugerido = variante.precio;
          if (!variante.precioOverride && variante.margenMeta) {
             sugerido = costoTotal / (1 - variante.margenMeta / 100);
          }

          const margenActual = variante.precio > 0 ? ((variante.precio - costoTotal) / variante.precio) * 100 : 0;
          const expandido = varianteExpandida === variante.sku;

          return (
            <div key={variante.sku} className="rounded-md border border-[#222A27] bg-[#0D1110] overflow-hidden">
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#151A18] transition-colors"
                onClick={() => toggleExpandir(variante.sku)}
              >
                <div className="flex items-center gap-3">
                  {expandido ? <ChevronDown className="h-5 w-5 text-[#A6AEAA]" /> : <ChevronRight className="h-5 w-5 text-[#A6AEAA]" />}
                  <div>
                    <div className="font-medium text-[#F3F5F4] flex items-center gap-2">
                      {Object.values(variante.combinacion).join(" / ")}
                      {(variante.insumosExtra && variante.insumosExtra.length > 0) && (
                         <span className="text-xs bg-[#16D39A]/20 text-[#16D39A] px-2 py-0.5 rounded-full">+ Insumos extra</span>
                      )}
                    </div>
                    <div className="text-xs text-[#A6AEAA]">SKU: {variante.sku} | Costo Total: ${costoTotal.toFixed(2)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-6" onClick={e => e.stopPropagation()}>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-[#A6AEAA] mb-1">Precio Final</span>
                    <div className="relative w-32">
                      <span className="absolute left-3 top-2.5 text-sm text-[#A6AEAA]">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={variante.precio}
                        onChange={(e) => actualizarPrecio(variante.sku, parseFloat(e.target.value) || 0)}
                        className="flex h-10 w-full rounded-md border border-[#222A27] bg-[#111615] pl-7 pr-3 text-sm text-[#F3F5F4] outline-none focus:border-[#16D39A]"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-end w-20">
                    <span className="text-xs text-[#A6AEAA] mb-1">Margen</span>
                    <span className={`text-sm font-medium ${margenActual < 0 ? 'text-red-400' : 'text-[#16D39A]'}`}>
                      {margenActual.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {expandido && (
                <div className="p-4 border-t border-[#222A27] bg-[#111615] flex flex-col gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-[#F3F5F4] mb-3 flex items-center gap-2">
                      <Settings2 className="h-4 w-4 text-[#16D39A]" />
                      Insumos Especficos para {Object.values(variante.combinacion).join(" / ")}
                    </h4>
                    
                    <div className="mb-4">
                      <BuscadorInsumos onSeleccionar={(ins) => agregarInsumoExtra(variante.sku, ins)} />
                    </div>

                    {variante.insumosExtra && variante.insumosExtra.length > 0 ? (
                      <div className="rounded-md border border-[#222A27] bg-[#090B0B] overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-[#151A18] text-[#A6AEAA]">
                            <tr>
                              <th className="px-4 py-2 font-medium">Insumo</th>
                              <th className="px-4 py-2 font-medium w-32">Cantidad</th>
                              <th className="px-4 py-2 font-medium w-24">Costo Extra</th>
                              <th className="px-4 py-2 w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#222A27]">
                            {variante.insumosExtra.map((insumo) => (
                              <tr key={insumo.producto_id}>
                                <td className="px-4 py-3 text-[#F3F5F4]">{insumo.nombre}</td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={insumo.cantidad}
                                    onChange={(e) => actualizarCantidadExtra(variante.sku, insumo.producto_id, parseFloat(e.target.value) || 0)}
                                    className={`${CLASES_INPUT} h-9 !bg-[#111615]`}
                                  />
                                </td>
                                <td className="px-4 py-3 text-[#A6AEAA]">${(insumo.precio * insumo.cantidad).toFixed(2)}</td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    onClick={() => eliminarInsumoExtra(variante.sku, insumo.producto_id)}
                                    className="text-[#EF4444] hover:text-[#EF4444]/80 p-1"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-[#A6AEAA] italic">No hay insumos extra para esta variante.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between mt-4">
        <button
          type="button"
          onClick={alAtras}
          disabled={estaEnviando}
          className="flex min-h-11 items-center justify-center rounded-md border border-[#222A27] px-5 text-sm font-semibold text-[#F3F5F4] hover:bg-[#222A27] transition-colors"
        >
          Atrǭs
        </button>
        <button
          type="button"
          onClick={alFinalizar}
          disabled={estaEnviando}
          className="flex min-h-11 items-center justify-center rounded-md bg-[#16D39A] px-5 text-sm font-semibold text-[#090B0B] hover:bg-[#16D39A]/90 transition-colors"
        >
          {estaEnviando ? "Guardando..." : "Finalizar Producto"}
        </button>
      </div>
    </div>
  );
}
