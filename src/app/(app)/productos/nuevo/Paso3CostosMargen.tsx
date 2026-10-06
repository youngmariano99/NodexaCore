"use client";

import { useMemo, useEffect, useState } from "react";
import { Info, Loader2 } from "lucide-react";
import { type InsumoReceta } from "./Paso2RecetaInsumos";
import { crearClienteSupabaseNavegador } from "@/lib/supabase/client";

interface CostoIndirecto {
  costo_indirecto_id: string;
  nombre: string;
  tipo_calculo: "fijo" | "porcentaje";
  valor: number;
}

interface Paso3CostosMargenProps {
  insumos: InsumoReceta[];
  rendimiento: number;
  precioVentaActual: number;
  margenMeta: number;
  setMargenMeta: React.Dispatch<React.SetStateAction<number>>;
  setPrecio: React.Dispatch<React.SetStateAction<number>>;
  costosIndirectosSeleccionados: string[];
  setCostosIndirectosSeleccionados: React.Dispatch<React.SetStateAction<string[]>>;
  alAtras: () => void;
  alFinalizar: () => void;
  estaEnviando: boolean;
}

const CLASES_INPUT = "flex h-11 w-full rounded-md border border-[#222A27] bg-[#090B0B] px-3 py-2 text-sm text-[#F3F5F4] outline-none transition-colors placeholder:text-[#A6AEAA] focus:border-[#16D39A] focus:ring-1 focus:ring-[#16D39A] disabled:cursor-not-allowed disabled:opacity-50";

export function Paso3CostosMargen({
  insumos,
  rendimiento,
  precioVentaActual,
  margenMeta,
  setMargenMeta,
  setPrecio,
  costosIndirectosSeleccionados,
  setCostosIndirectosSeleccionados,
  alAtras,
  alFinalizar,
  estaEnviando,
}: Paso3CostosMargenProps) {
  const [costosDisponibles, setCostosDisponibles] = useState<CostoIndirecto[]>([]);
  const [cargandoCostos, setCargandoCostos] = useState(true);
  const supabase = crearClienteSupabaseNavegador();

  useEffect(() => {
    async function fetchCostos() {
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const { data: userData } = await supabase.from("usuarios").select("cliente_id").eq("auth_user_id", user.user.id).single();
        if (userData?.cliente_id) {
          const { data } = await supabase
            .from("costos_indirectos")
            .select("costo_indirecto_id, nombre, tipo_calculo, valor")
            .eq("cliente_id", userData.cliente_id)
            .is("eliminado_en", null)
            .order("nombre");
          if (data) setCostosDisponibles(data as CostoIndirecto[]);
        }
      }
      setCargandoCostos(false);
    }
    fetchCostos();
  }, [supabase]);

  const costoInsumosUnidad = useMemo(() => {
    const totalInsumos = insumos.reduce((acc, i) => acc + i.cantidad * i.precio, 0);
    return rendimiento > 0 ? totalInsumos / rendimiento : 0;
  }, [insumos, rendimiento]);

  const costoUnitarioTotal = useMemo(() => {
    let costoTotal = costoInsumosUnidad;
    // Sumar montos fijos
    costosIndirectosSeleccionados.forEach(id => {
      const c = costosDisponibles.find(x => x.costo_indirecto_id === id);
      if (c && c.tipo_calculo === "fijo") {
        costoTotal += c.valor;
      }
    });
    // Sumar porcentajes
    let extraPorcentaje = 0;
    costosIndirectosSeleccionados.forEach(id => {
      const c = costosDisponibles.find(x => x.costo_indirecto_id === id);
      if (c && c.tipo_calculo === "porcentaje") {
        extraPorcentaje += costoTotal * (c.valor / 100);
      }
    });
    
    return costoTotal + extraPorcentaje;
  }, [costoInsumosUnidad, costosIndirectosSeleccionados, costosDisponibles]);
  
  const precioSugerido = costoUnitarioTotal * (1 + (margenMeta || 0) / 100);
  
  const rentabilidadReal = (precioVentaActual > 0 && costoUnitarioTotal > 0)
    ? ((precioVentaActual - costoUnitarioTotal) / costoUnitarioTotal) * 100 
    : 0;

  const toggleCosto = (id: string) => {
    if (costosIndirectosSeleccionados.includes(id)) {
      setCostosIndirectosSeleccionados(prev => prev.filter(x => x !== id));
    } else {
      setCostosIndirectosSeleccionados(prev => [...prev, id]);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-[#F3F5F4]">Paso 3: Costos y Margen</h2>
        <p className="text-sm text-[#A6AEAA]">Agregá costos indirectos y ajustá tu precio de venta final.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-[#222A27] bg-[#0D1110] p-4 flex flex-col gap-1">
          <span className="text-sm font-medium text-[#A6AEAA]">Costo Total por Unidad</span>
          <span className="text-2xl font-bold text-[#F3F5F4]">${costoUnitarioTotal.toFixed(2)}</span>
          <span className="text-xs text-[#A6AEAA] mt-1">Insumos: ${costoInsumosUnidad.toFixed(2)}</span>
        </div>
        <div className={`rounded-lg border p-4 flex flex-col gap-1 ${rentabilidadReal >= (margenMeta || 0) ? 'border-[#16D39A] bg-[#16D39A]/5' : 'border-yellow-500 bg-yellow-500/5'}`}>
          <span className="text-sm font-medium text-[#A6AEAA]">Rentabilidad Actual</span>
          <span className={`text-2xl font-bold ${rentabilidadReal >= (margenMeta || 0) ? 'text-[#16D39A]' : 'text-yellow-500'}`}>
            {rentabilidadReal.toFixed(1)}%
          </span>
          <span className="text-xs mt-1 text-[#A6AEAA]">Precio act: ${precioVentaActual.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-[#F3F5F4]">Costos Indirectos Adicionales</h3>
        {cargandoCostos ? (
          <div className="flex h-12 items-center justify-center rounded-md border border-[#222A27] bg-[#090B0B]">
            <Loader2 className="h-4 w-4 animate-spin text-[#16D39A]" />
          </div>
        ) : costosDisponibles.length === 0 ? (
          <div className="rounded-md border border-[#222A27] bg-[#090B0B] p-4 text-center text-sm text-[#A6AEAA]">
            No hay costos indirectos configurados. Podés crearlos desde Configuración.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {costosDisponibles.map(c => (
              <label key={c.costo_indirecto_id} className="flex items-center gap-3 rounded-md border border-[#222A27] bg-[#090B0B] px-4 py-3 hover:bg-[#151A18] cursor-pointer">
                <input
                  type="checkbox"
                  checked={costosIndirectosSeleccionados.includes(c.costo_indirecto_id)}
                  onChange={() => toggleCosto(c.costo_indirecto_id)}
                  className="h-4 w-4 rounded border-[#222A27] bg-[#151A18] text-[#16D39A] focus:ring-[#16D39A] focus:ring-offset-[#090B0B]"
                />
                <div className="flex flex-1 items-center justify-between">
                  <span className="text-sm font-medium text-[#F3F5F4]">{c.nombre}</span>
                  <span className="text-sm font-mono text-[#A6AEAA]">
                    {c.tipo_calculo === "fijo" ? "$" : ""}{c.valor}{c.tipo_calculo === "porcentaje" ? "%" : ""}
                  </span>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 mt-2">
        <div>
          <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-[#F3F5F4]">
            Margen de Ganancia Meta (%)
            <Info className="h-4 w-4 text-[#A6AEAA]" />
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={margenMeta || ""}
            onChange={(e) => setMargenMeta(parseFloat(e.target.value) || 0)}
            className={`${CLASES_INPUT} max-w-[200px]`}
          />
        </div>

        <div className="rounded-lg border border-[#222A27] bg-[#151A18] p-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-[#A6AEAA]">Precio de Venta Sugerido</div>
            <div className="text-xl font-bold text-[#F3F5F4]">${Math.ceil(precioSugerido).toFixed(2)}</div>
          </div>
          <button
            type="button"
            onClick={() => setPrecio(Math.ceil(precioSugerido))}
            className="flex h-9 items-center justify-center rounded-md border border-[#16D39A] px-4 text-xs font-semibold text-[#16D39A] hover:bg-[#16D39A]/10 transition-colors"
          >
            Aplicar Sugerencia
          </button>
        </div>
      </div>

      <div className="flex justify-between mt-4">
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
          className="flex min-h-11 items-center justify-center rounded-md bg-[#16D39A] px-5 text-sm font-semibold text-[#090B0B] hover:bg-[#16D39A]/90 transition-colors"
        >
          Guardar Producto
        </button>
      </div>
    </div>
  );
}
