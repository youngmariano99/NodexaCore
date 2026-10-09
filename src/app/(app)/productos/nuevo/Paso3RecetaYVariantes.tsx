"use client";

import { useState } from "react";
import { Trash2, Calculator, Package, ChevronDown, ChevronRight, Settings2 } from "lucide-react";
import { BuscadorInsumos } from "./BuscadorInsumos";
import type { VarianteMatriz } from "./FormularioAltaProductoWizard";

export interface InsumoReceta {
  producto_id: string;
  sku: string;
  nombre: string;
  precio: number;
  cantidad: number;
}

export interface VarianteGastronomica extends VarianteMatriz {
  insumosExtra?: InsumoReceta[];
  margenMeta?: number;
  precioOverride?: boolean;
}

interface Paso3RecetaYVariantesProps {
  dimensionesActivas: boolean;
  insumos: InsumoReceta[];
  setInsumos: React.Dispatch<React.SetStateAction<InsumoReceta[]>>;
  rendimiento: number;
  setRendimiento: React.Dispatch<React.SetStateAction<number>>;
  matrizVariantes: VarianteGastronomica[];
  setMatrizVariantes: React.Dispatch<React.SetStateAction<VarianteGastronomica[]>>;
  alAtras: () => void;
  alFinalizar: () => void;
  estaEnviando: boolean;
}

const CLASES_INPUT = "flex h-11 w-full rounded-md border border-[#222A27] bg-[#090B0B] px-3 py-2 text-sm text-[#F3F5F4] outline-none transition-colors placeholder:text-[#A6AEAA] focus:border-[#16D39A] focus:ring-1 focus:ring-[#16D39A] disabled:cursor-not-allowed disabled:opacity-50";

export function Paso3RecetaYVariantes({
  dimensionesActivas,
  insumos,
  setInsumos,
  rendimiento,
  setRendimiento,
  matrizVariantes,
  setMatrizVariantes,
  alAtras,
  alFinalizar,
  estaEnviando,
}: Paso3RecetaYVariantesProps) {
  const [esLote, setEsLote] = useState<boolean>(rendimiento > 1);
  const [varianteExpandida, setVarianteExpandida] = useState<string | null>(null);

  // MANEJO RECETA BASE
  const agregarInsumo = (insumoBase: { producto_id: string; sku: string; nombre: string; precio: number }) => {
    if (insumos.some((i) => i.producto_id === insumoBase.producto_id)) return;
    setInsumos([...insumos, { ...insumoBase, cantidad: 1 }]);
  };

  const actualizarCantidad = (id: string, cant: number) => {
    setInsumos(insumos.map((i) => (i.producto_id === id ? { ...i, cantidad: cant } : i)));
  };

  const eliminarInsumo = (id: string) => {
    setInsumos(insumos.filter((i) => i.producto_id !== id));
  };

  const manejarCambioModo = (modoLote: boolean) => {
    setEsLote(modoLote);
    if (!modoLote) {
      setRendimiento(1);
    }
  };

  const costoTotalBase = insumos.reduce((acc, insumo) => acc + insumo.precio * insumo.cantidad, 0);
  const costoBaseUnitario = rendimiento > 0 ? costoTotalBase / rendimiento : 0;

  // MANEJO VARIANTES
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
    <div className="flex w-full flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* SECCIÓN RECETA BASE */}
      <div className="flex flex-col gap-6 rounded-lg border border-[#222A27] bg-[#0D1110] p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-[#F3F5F4]">{dimensionesActivas ? "1. Insumos Base (compartidos en todas las variantes)" : "Receta de Insumos"}</h2>
          <p className="text-sm text-[#A6AEAA]">
            {dimensionesActivas 
              ? "Definí acá los insumos que son iguales para todos los tamaños o versiones. Podés dejarlo vacío si no hay insumos en común."
              : "Definí los insumos y el rendimiento para calcular el costo de este producto."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => manejarCambioModo(false)}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
              !esLote 
                ? "border-[#16D39A] bg-[#16D39A]/10 text-[#16D39A]" 
                : "border-[#222A27] bg-[#090B0B] text-[#A6AEAA] hover:border-[#A6AEAA]"
            }`}
          >
            <Package className="h-5 w-5 mb-1" />
            <span className="font-semibold text-sm">Para 1 unidad</span>
          </button>
          <button
            type="button"
            onClick={() => manejarCambioModo(true)}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
              esLote 
                ? "border-[#16D39A] bg-[#16D39A]/10 text-[#16D39A]" 
                : "border-[#222A27] bg-[#090B0B] text-[#A6AEAA] hover:border-[#A6AEAA]"
            }`}
          >
            <Calculator className="h-5 w-5 mb-1" />
            <span className="font-semibold text-sm">Por Lote (Varias uds.)</span>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {esLote && (
            <div className="p-4 bg-[#111615] border border-[#222A27] rounded-md">
              <label className="mb-1.5 block text-sm font-medium text-[#F3F5F4]">
                ¿Cuántas unidades rinde esta base en total?
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={rendimiento || ""}
                  onChange={(e) => setRendimiento(parseFloat(e.target.value) || 1)}
                  className={`${CLASES_INPUT} max-w-[150px]`}
                />
                <span className="text-sm text-[#A6AEAA]">unidades finales.</span>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#F3F5F4]">
              {esLote ? `Agregar insumos base (cantidades para ${rendimiento} u.)` : "Agregar insumos base"}
            </label>
            <BuscadorInsumos onSeleccionar={agregarInsumo} />
          </div>

          {insumos.length > 0 && (
            <div className="rounded-lg border border-[#222A27] bg-[#090B0B] overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#151A18] text-[#A6AEAA]">
                  <tr>
                    <th className="px-4 py-2 font-medium">Insumo Base</th>
                    <th className="px-4 py-2 font-medium w-32">Cantidad</th>
                    <th className="px-4 py-2 font-medium text-right">Costo Parcial</th>
                    <th className="px-4 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222A27]">
                  {insumos.map((insumo) => (
                    <tr key={insumo.producto_id}>
                      <td className="px-4 py-3 font-medium text-[#F3F5F4]">{insumo.nombre}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={insumo.cantidad || ""}
                          onChange={(e) => actualizarCantidad(insumo.producto_id, parseFloat(e.target.value) || 0)}
                          className={`${CLASES_INPUT} h-8 px-2`}
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#F3F5F4]">
                        ${(insumo.cantidad * insumo.precio).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => eliminarInsumo(insumo.producto_id)}
                          className="text-[#EF4444] hover:text-[#EF4444]/80 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bg-[#151A18] p-3 flex justify-between items-center border-t border-[#222A27]">
                 <span className="text-xs text-[#A6AEAA]">Costo Base Unitario calculado:</span>
                 <span className="font-bold text-[#16D39A] text-base">${costoBaseUnitario.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN VARIANTES (Solo si hay dimensiones activas) */}
      {dimensionesActivas && matrizVariantes.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-[#F3F5F4]">2. Matriz de Variantes y Costos Específicos</h2>
            <p className="text-sm text-[#A6AEAA]">
              A cada variante se le suma automáticamente el <strong>Costo Base Unitario (${costoBaseUnitario.toFixed(2)})</strong>. Podés agregar insumos extra y ajustar el precio final por variante.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {matrizVariantes.map((variante) => {
              const costoExtra = (variante.insumosExtra || []).reduce((acc, i) => acc + i.precio * i.cantidad, 0);
              const costoTotalVariante = costoBaseUnitario + (rendimiento > 0 ? costoExtra / rendimiento : costoExtra);
              const margenActual = variante.precio > 0 ? ((variante.precio - costoTotalVariante) / variante.precio) * 100 : 0;
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
                        <div className="text-xs text-[#A6AEAA]">SKU: {variante.sku} | Costo Final: ${costoTotalVariante.toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6" onClick={e => e.stopPropagation()}>
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-[#A6AEAA] mb-1">Precio Venta</span>
                        <div className="relative w-28">
                          <span className="absolute left-3 top-2 text-sm text-[#A6AEAA]">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={variante.precio || ""}
                            onChange={(e) => actualizarPrecio(variante.sku, parseFloat(e.target.value) || 0)}
                            className="flex h-9 w-full rounded-md border border-[#222A27] bg-[#111615] pl-6 pr-2 text-sm text-[#F3F5F4] outline-none focus:border-[#16D39A]"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col items-end w-16">
                        <span className="text-xs text-[#A6AEAA] mb-1">Margen</span>
                        <span className={`text-sm font-medium ${margenActual < 0 ? 'text-red-400' : 'text-[#16D39A]'}`}>
                          {margenActual.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {expandido && (
                    <div className="p-4 border-t border-[#222A27] bg-[#111615] flex flex-col gap-4">
                      <h4 className="text-sm font-medium text-[#F3F5F4] mb-1 flex items-center gap-2">
                        <Settings2 className="h-4 w-4 text-[#16D39A]" />
                        Insumos Específicos para &quot;{Object.values(variante.combinacion).join(" / ")}&quot;
                      </h4>
                      
                      <div className="mb-2">
                        <BuscadorInsumos onSeleccionar={(ins) => agregarInsumoExtra(variante.sku, ins)} />
                      </div>

                      {variante.insumosExtra && variante.insumosExtra.length > 0 ? (
                        <div className="rounded-md border border-[#222A27] bg-[#090B0B] overflow-hidden">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-[#151A18] text-[#A6AEAA]">
                              <tr>
                                <th className="px-4 py-2 font-medium">Insumo Específico</th>
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
                                      min="0.001"
                                      step="0.001"
                                      value={insumo.cantidad || ""}
                                      onChange={(e) => actualizarCantidadExtra(variante.sku, insumo.producto_id, parseFloat(e.target.value) || 0)}
                                      className={`${CLASES_INPUT} h-8 px-2 !bg-[#111615]`}
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-[#A6AEAA] font-mono">${(insumo.precio * insumo.cantidad).toFixed(2)}</td>
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
                        <p className="text-sm text-[#A6AEAA] italic">Sin agregados extras en esta variante.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BOTONERA INFERIOR */}
      <div className="flex justify-between mt-4 border-t border-[#222A27] pt-6">
        <button
          type="button"
          onClick={alAtras}
          disabled={estaEnviando}
          className="flex min-h-11 items-center justify-center rounded-md border border-[#222A27] px-5 text-sm font-semibold text-[#F3F5F4] hover:bg-[#222A27] transition-colors"
        >
          Atrás
        </button>
        <button
          type="button"
          onClick={alFinalizar}
          disabled={estaEnviando}
          className="flex min-h-11 items-center justify-center rounded-md bg-[#16D39A] px-6 text-sm font-semibold text-[#090B0B] hover:bg-[#16D39A]/90 transition-colors"
        >
          {estaEnviando ? "Guardando..." : "Finalizar Producto"}
        </button>
      </div>
    </div>
  );
}
