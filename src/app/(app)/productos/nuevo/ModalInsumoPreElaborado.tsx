"use client";

import { useState } from "react";
import { X, Loader2, Trash2 } from "lucide-react";
import { BuscadorInsumos } from "./BuscadorInsumos";
import { crearInsumoPreElaboradoInline } from "@/services/productos/crearInsumoPreElaboradoInline";

interface ModalInsumoPreElaboradoProps {
  nombreBase: string;
  onCerrar: () => void;
  onGuardado: (insumo: { producto_id: string; sku: string; nombre: string; precio: number }) => void;
}

export function ModalInsumoPreElaborado({ nombreBase, onCerrar, onGuardado }: ModalInsumoPreElaboradoProps) {
  const [nombre, setNombre] = useState(nombreBase);
  const [rendimiento, setRendimiento] = useState<number>(1);
  const [insumos, setInsumos] = useState<Array<{ producto_id: string; nombre: string; precio: number; cantidad: number }>>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (insumos.length === 0) return setError("Agregá al menos un insumo a la receta.");
    if (rendimiento <= 0) return setError("El rendimiento debe ser mayor a 0.");

    setGuardando(true);
    setError(null);

    try {
      const res = await crearInsumoPreElaboradoInline({
        nombre: nombre.trim(),
        rendimiento,
        costoUnitarioCalculado: costoUnitario,
        insumos,
      });

      if (res.exito && res.insumo) {
        onGuardado(res.insumo);
      } else {
        setError(res.error || "Error al crear el insumo pre-elaborado.");
      }
    } catch {
      setError("Error interno del servidor.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-2xl flex-col gap-6 rounded-lg border border-[#222A27] bg-[#090B0B] p-6 shadow-xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-[#222A27] pb-4">
          <div>
            <h2 className="text-xl font-bold text-[#F3F5F4]">Crear Pre-Elaborado / Sub-Receta</h2>
            <p className="text-sm text-[#A6AEAA] mt-1">Ideal para salsas, masas, picadillos, o preparaciones base.</p>
          </div>
          <button onClick={onCerrar} className="rounded-full p-2 text-[#A6AEAA] hover:bg-[#151A18] hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-[#F3F5F4]">Nombre de la preparación</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="flex h-11 w-full rounded-md border border-[#222A27] bg-[#111615] px-3 text-sm text-[#F3F5F4] focus:border-[#16D39A] focus:outline-none"
              />
            </div>
            <div className="col-span-1">
              <label className="mb-1.5 block text-sm font-medium text-[#F3F5F4]">Rendimiento</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={rendimiento || ""}
                  onChange={(e) => setRendimiento(parseFloat(e.target.value) || 0)}
                  className="flex h-11 w-full rounded-md border border-[#222A27] bg-[#111615] px-3 text-sm text-[#F3F5F4] focus:border-[#16D39A] focus:outline-none"
                />
                <span className="text-xs text-[#A6AEAA]">unidades</span>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#F3F5F4]">Agregar ingredientes a la mezcla</label>
            <div className="relative z-50">
               {/* Evitamos que este buscador abra otro modal pasándole una prop u ocultándolo. Pero por ahora funcionará como Insumo Simple. */}
               <BuscadorInsumos onSeleccionar={agregarInsumo} soloSimples={true} />
            </div>
          </div>

          <div className="rounded-md border border-[#222A27] bg-[#0D1110] overflow-hidden max-h-60 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#151A18] text-[#A6AEAA] sticky top-0">
                <tr>
                  <th className="px-4 py-2 font-medium">Ingrediente</th>
                  <th className="px-4 py-2 font-medium w-32">Cantidad</th>
                  <th className="px-4 py-2 font-medium w-24 text-right">Costo</th>
                  <th className="px-4 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222A27]">
                {insumos.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-[#A6AEAA] italic">No hay ingredientes cargados.</td></tr>
                ) : insumos.map((ins) => (
                  <tr key={ins.producto_id}>
                    <td className="px-4 py-3 text-[#F3F5F4]">{ins.nombre}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={ins.cantidad}
                        onChange={(e) => actualizarCantidad(ins.producto_id, parseFloat(e.target.value) || 0)}
                        className="flex h-8 w-20 rounded-md border border-[#222A27] bg-[#111615] px-2 text-sm text-[#F3F5F4] focus:border-[#16D39A] focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-[#A6AEAA]">${(ins.precio * ins.cantidad).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => eliminarInsumo(ins.producto_id)} className="text-[#EF4444] hover:text-white p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center bg-[#151A18] p-4 rounded-md border border-[#222A27]">
            <div className="flex flex-col">
               <span className="text-xs text-[#A6AEAA]">Costo Total del Lote</span>
               <span className="text-[#F3F5F4] font-medium">${costoTotalLote.toFixed(2)}</span>
            </div>
            <div className="flex flex-col text-right">
               <span className="text-xs text-[#A6AEAA]">Costo final por unidad</span>
               <span className="text-[#16D39A] font-bold text-lg">${costoUnitario.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {error && <div className="text-sm text-red-400 bg-red-400/10 p-3 rounded-md border border-red-400/20">{error}</div>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCerrar}
            disabled={guardando}
            className="rounded-md border border-[#222A27] px-4 py-2 text-sm font-semibold text-[#F3F5F4] hover:bg-[#151A18]"
          >
            Cancelar
          </button>
          <button
            onClick={manejarGuardar}
            disabled={guardando}
            className="flex items-center gap-2 rounded-md bg-[#16D39A] px-4 py-2 text-sm font-semibold text-[#090B0B] hover:bg-[#16D39A]/90 disabled:opacity-50"
          >
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar y Usar
          </button>
        </div>
      </div>
    </div>
  );
}
