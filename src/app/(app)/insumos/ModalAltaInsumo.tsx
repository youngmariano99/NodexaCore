"use client";

import { useState } from "react";
import { X, Loader2, Trash2, Settings2, Package } from "lucide-react";
import { BuscadorInsumos } from "@/app/(app)/productos/nuevo/BuscadorInsumos";
import { crearInsumoPreElaboradoInline } from "@/services/productos/crearInsumoPreElaboradoInline";
import { crearInsumoInline } from "@/services/productos/crearInsumoInline";

interface ModalAltaInsumoProps {
  alCerrar: () => void;
  alGuardar: () => void;
}

const CLASES_INPUT = "flex h-11 w-full rounded-md border border-[#222A27] bg-[#090B0B] px-3 py-2 text-sm text-[#F3F5F4] outline-none transition-colors placeholder:text-[#A6AEAA] focus:border-[#16D39A] focus:ring-1 focus:ring-[#16D39A] disabled:cursor-not-allowed disabled:opacity-50";

export function ModalAltaInsumo({ alCerrar, alGuardar }: ModalAltaInsumoProps) {
  const [esPreElaborado, setEsPreElaborado] = useState(false);
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Campos para simple
  const [costo, setCosto] = useState<number>(0);

  // Campos para pre-elaborado
  const [rendimiento, setRendimiento] = useState<number>(1);
  const [insumos, setInsumos] = useState<Array<{ producto_id: string; nombre: string; precio: number; cantidad: number }>>([]);

  const agregarInsumo = (ins: { producto_id: string; nombre: string; precio: number }) => {
    if (insumos.some((i) => i.producto_id === ins.producto_id)) return;
    setInsumos([...insumos, { ...ins, cantidad: 1 }]);
  };

  const actualizarCantidad = (id: string, cant: number) => {
    setInsumos(insumos.map((i) => (i.producto_id === id ? { ...i, cantidad: cant } : i)));
  };

  const eliminarInsumo = (id: string) => {
    setInsumos(insumos.filter((i) => i.producto_id !== id));
  };

  const costoTotalLote = insumos.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
  const costoUnitario = rendimiento > 0 ? costoTotalLote / rendimiento : 0;

  const manejarGuardar = async () => {
    if (!nombre.trim()) return setError("El nombre es obligatorio.");

    setGuardando(true);
    setError(null);

    try {
      if (esPreElaborado) {
        if (insumos.length === 0) return setError("Agregá al menos un insumo a la receta.");
        if (rendimiento <= 0) return setError("El rendimiento debe ser mayor a 0.");

        const res = await crearInsumoPreElaboradoInline({
          nombre: nombre.trim(),
          rendimiento,
          costoUnitarioCalculado: costoUnitario,
          insumos,
        });

        if (res.exito) {
          alGuardar();
        } else {
          setError(res.error || "Error al crear insumo pre-elaborado.");
        }
      } else {
        if (costo < 0) return setError("El costo no puede ser negativo.");

        const fd = new FormData();
        fd.append("nombre", nombre.trim());
        fd.append("costo", costo.toString());

        const res = await crearInsumoInline(null, fd);
        if (res.exito) {
          alGuardar();
        } else {
          setError(res.error || "Error al crear insumo simple.");
        }
      }
    } catch {
      setError("Error interno al guardar.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-full w-full max-w-2xl flex-col rounded-lg border border-[#222A27] bg-[#0D1110] shadow-xl overflow-hidden flex-shrink-0">
        <div className="flex items-center justify-between border-b border-[#222A27] px-6 py-4 flex-shrink-0 bg-[#111615]">
          <h3 className="text-lg font-semibold text-[#F3F5F4]">Nuevo Insumo</h3>
          <button onClick={alCerrar} className="text-[#A6AEAA] hover:text-[#F3F5F4] transition-colors p-1">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
          <div className="flex gap-4">
            <button
              onClick={() => setEsPreElaborado(false)}
              className={`flex-1 flex flex-col sm:flex-row items-center gap-3 p-4 rounded-lg border-2 transition-all ${!esPreElaborado ? "border-[#16D39A] bg-[#16D39A]/10 text-[#16D39A]" : "border-[#222A27] bg-[#090B0B] text-[#A6AEAA] hover:border-[#A6AEAA]"}`}
            >
              <Package className="h-5 w-5" />
              <div className="flex flex-col text-left">
                <span className="font-semibold text-sm">Materia Prima</span>
                <span className="text-xs opacity-80 hidden sm:block">Insumo simple de compra directa</span>
              </div>
            </button>
            <button
              onClick={() => setEsPreElaborado(true)}
              className={`flex-1 flex flex-col sm:flex-row items-center gap-3 p-4 rounded-lg border-2 transition-all ${esPreElaborado ? "border-[#16D39A] bg-[#16D39A]/10 text-[#16D39A]" : "border-[#222A27] bg-[#090B0B] text-[#A6AEAA] hover:border-[#A6AEAA]"}`}
            >
              <Settings2 className="h-5 w-5" />
              <div className="flex flex-col text-left">
                <span className="font-semibold text-sm">Pre-elaborado</span>
                <span className="text-xs opacity-80 hidden sm:block">Insumo compuesto por receta</span>
              </div>
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#F3F5F4]">Nombre del insumo</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Harina 0000, Masa Madre, Salsa de Tomate..."
              className={CLASES_INPUT}
            />
          </div>

          {!esPreElaborado ? (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#F3F5F4]">Costo Unitario / Medida</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-[#A6AEAA]">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costo || ""}
                  onChange={(e) => setCosto(parseFloat(e.target.value) || 0)}
                  className={`${CLASES_INPUT} pl-7`}
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-[#A6AEAA]">Costo estimado de la unidad de medida que vas a usar en tus recetas (por ejemplo: costo de 1kg, 1 litro, etc).</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#F3F5F4]">Rendimiento del lote</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={rendimiento || ""}
                  onChange={(e) => setRendimiento(parseFloat(e.target.value) || 0)}
                  className={CLASES_INPUT}
                />
                <p className="text-xs text-[#A6AEAA]">¿Cuántas unidades de este pre-elaborado salen con la receta que vas a armar abajo?</p>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-sm font-medium text-[#F3F5F4]">Ingredientes de la receta</label>
                <BuscadorInsumos onSeleccionar={agregarInsumo} soloSimples={true} />
                
                {insumos.length > 0 ? (
                  <div className="rounded-lg border border-[#222A27] bg-[#090B0B] overflow-x-auto mt-2">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#151A18] text-[#A6AEAA] border-b border-[#222A27]">
                        <tr>
                          <th className="px-4 py-2 font-medium">Insumo</th>
                          <th className="px-4 py-2 font-medium w-32">Cantidad</th>
                          <th className="px-4 py-2 font-medium w-24">Costo</th>
                          <th className="px-4 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#222A27]">
                        {insumos.map((ins) => (
                          <tr key={ins.producto_id}>
                            <td className="px-4 py-3 text-[#F3F5F4]">{ins.nombre}</td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min="0.001"
                                step="0.001"
                                value={ins.cantidad || ""}
                                onChange={(e) => actualizarCantidad(ins.producto_id, parseFloat(e.target.value) || 0)}
                                className={`${CLASES_INPUT} h-8 px-2`}
                              />
                            </td>
                            <td className="px-4 py-3 text-[#A6AEAA] font-mono">${(ins.precio * ins.cantidad).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => eliminarInsumo(ins.producto_id)} className="text-red-400 hover:text-red-300 p-1">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-sm text-[#A6AEAA] p-4 text-center border border-dashed border-[#222A27] rounded-lg">
                    Agregá insumos a la receta para calcular el costo.
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1 rounded-lg bg-[#16D39A]/10 p-4 border border-[#16D39A]/20">
                <div className="flex justify-between items-center text-sm text-[#A6AEAA]">
                  <span>Costo total del lote:</span>
                  <span className="font-mono text-[#F3F5F4]">${costoTotalLote.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-semibold text-[#16D39A]">
                  <span>Costo Unitario (por {rendimiento}):</span>
                  <span className="font-mono text-lg">${costoUnitario.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-400 mt-2">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#222A27] p-6 bg-[#111615] flex-shrink-0">
          <button
            onClick={alCerrar}
            disabled={guardando}
            className="rounded-md px-4 py-2 text-sm font-medium text-[#A6AEAA] hover:text-[#F3F5F4] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={manejarGuardar}
            disabled={guardando}
            className="flex min-w-32 items-center justify-center rounded-md bg-[#16D39A] px-4 py-2 text-sm font-semibold text-[#090B0B] hover:bg-[#16D39A]/90 transition-colors disabled:opacity-50"
          >
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Insumo"}
          </button>
        </div>
      </div>
    </div>
  );
}
