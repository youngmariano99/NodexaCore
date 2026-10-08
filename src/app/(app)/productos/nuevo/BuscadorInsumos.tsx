"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Loader2 } from "lucide-react";
import { crearClienteSupabaseNavegador } from "@/lib/supabase/client";
import { crearInsumoInline } from "@/services/productos/crearInsumoInline";
import { ModalInsumoPreElaborado } from "./ModalInsumoPreElaborado";

interface Insumo {
  producto_id: string;
  sku: string;
  nombre: string;
  precio: number;
}

interface BuscadorInsumosProps {
  soloSimples?: boolean;
  onSeleccionar: (insumo: Insumo) => void;
}

const CLASES_INPUT = "flex h-11 w-full rounded-md border border-[#222A27] bg-[#090B0B] px-3 py-2 text-sm text-[#F3F5F4] outline-none transition-colors placeholder:text-[#A6AEAA] focus:border-[#16D39A] focus:ring-1 focus:ring-[#16D39A] disabled:cursor-not-allowed disabled:opacity-50";

export function BuscadorInsumos({ onSeleccionar, soloSimples }: BuscadorInsumosProps) {
  const [termino, setTermino] = useState("");
  const [resultados, setResultados] = useState<Insumo[]>([]);
  const [buscando, setBuscando] = useState(false);
  
  const [mostrandoCrear, setMostrandoCrear] = useState<"simple" | "compuesto" | false>(false);
  const [precioNuevo, setPrecioNuevo] = useState<string>("");
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  const supabase = crearClienteSupabaseNavegador();

  useEffect(() => {
    if (!termino || termino.length < 2) {
      return;
    }

    const timer = setTimeout(async () => {
      setBuscando(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setBuscando(false);
        return;
      }
      
      const { data: userRow } = await supabase.from("usuarios").select("cliente_id").eq("auth_user_id", userData.user.id).single();
      
      if (userRow?.cliente_id) {
        const { data } = await supabase
          .from("productos")
          .select("producto_id, sku, nombre, precio")
          .eq("cliente_id", userRow.cliente_id)
          .eq("tipo_producto", "insumo")
          .is("eliminado_en", null)
          .ilike("nombre", `%${termino}%`)
          .limit(10);
        
        if (data) setResultados(data);
      }
      setBuscando(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [termino, supabase]);

  const manejarCrearInsumo = async () => {
    setCreando(true);
    setErrorCrear(null);
    try {
      const formData = new FormData();
      formData.set("nombre", termino);
      formData.set("costo", precioNuevo || "0");
      
      const res = await crearInsumoInline(null, formData);
      if (res.exito && res.insumo) {
        onSeleccionar(res.insumo);
        setTermino("");
        setResultados([]);
        setMostrandoCrear(false);
        setPrecioNuevo("");
      } else {
        setErrorCrear(res.error || "Error al crear insumo.");
      }
    } catch {
      setErrorCrear("Error interno del servidor.");
    } finally {
      setCreando(false);
    }
  };

  const mostrarDropdown = termino.length >= 2 && !buscando;

  return (
    <div className="flex flex-col gap-2 relative">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-[#A6AEAA]" />
        <input
          type="text"
          placeholder="Buscar insumo por nombre..."
          value={termino}
          onChange={(e) => { 
            const val = e.target.value; 
            setTermino(val); 
            if (!val || val.length < 2) { 
              setResultados([]); 
            } 
            setMostrandoCrear(false); 
            setErrorCrear(null); 
          }}
          className={`${CLASES_INPUT} pl-9`}
        />
        {buscando && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-[#16D39A]" />}
      </div>
      
      {mostrandoCrear === "compuesto" && (
        <ModalInsumoPreElaborado 
          nombreBase={termino} 
          onCerrar={() => setMostrandoCrear(false)}
          onGuardado={(ins) => {
            onSeleccionar(ins);
            setTermino("");
            setResultados([]);
            setMostrandoCrear(false);
          }}
        />
      )}
      
      {mostrarDropdown && (
        <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-80 overflow-y-auto rounded-md border border-[#222A27] bg-[#090B0B] shadow-lg flex flex-col">
          {resultados.map((insumo) => (
            <button
              key={insumo.producto_id}
              type="button"
              className="flex w-full items-center justify-between px-4 py-2 hover:bg-[#151A18] text-left border-b border-[#222A27] last:border-0"
              onClick={() => {
                onSeleccionar(insumo);
                setTermino("");
                setResultados([]);
                setMostrandoCrear(false);
              }}
            >
              <div>
                <div className="text-sm font-medium text-[#F3F5F4]">{insumo.nombre}</div>
                <div className="text-xs text-[#A6AEAA]">{insumo.sku} - ${insumo.precio}</div>
              </div>
              <Plus className="h-4 w-4 text-[#16D39A]" />
            </button>
          ))}

          {resultados.length === 0 && !mostrandoCrear && (
            <div className="px-4 py-3 text-sm text-[#A6AEAA] text-center border-b border-[#222A27]">
              No se encontraron insumos con ese nombre.
            </div>
          )}

          {!mostrandoCrear ? (
            <div className="flex flex-col border-t border-[#222A27] bg-[#0D1110] sticky bottom-0">
              <button
                type="button"
                onClick={() => setMostrandoCrear("simple")}
                className="flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[#16D39A] hover:bg-[#151A18] transition-colors border-b border-[#222A27]"
              >
                <Plus className="h-4 w-4" />
                Crear &quot;{termino}&quot; (Simple)
              </button>
              {!soloSimples && (
                <button
                  type="button"
                  onClick={() => setMostrandoCrear("compuesto")}
                  className="flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[#A6AEAA] hover:text-[#16D39A] hover:bg-[#151A18] transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Crear &quot;{termino}&quot; (Pre-Elaborado)
                </button>
              )}
            </div>
          ) : mostrandoCrear === "simple" ? (
            <div className="p-4 bg-[#0D1110] flex flex-col gap-3 sticky bottom-0 border-t border-[#222A27]">
              <div className="text-sm font-medium text-[#F3F5F4]">
                Nuevo Insumo: <span className="text-[#16D39A]">{termino}</span>
              </div>
              <div>
                <label className="block text-xs text-[#A6AEAA] mb-1">Costo (Precio)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-[#A6AEAA]">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={precioNuevo}
                    onChange={(e) => setPrecioNuevo(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-[#222A27] bg-[#111615] pl-7 pr-3 text-sm text-[#F3F5F4] outline-none focus:border-[#16D39A]"
                    placeholder="0.00"
                  />
                </div>
              </div>
              {errorCrear && <div className="text-xs text-red-500">{errorCrear}</div>}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setMostrandoCrear(false); setErrorCrear(null); }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white"
                  disabled={creando}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={manejarCrearInsumo}
                  disabled={creando}
                  className="flex items-center gap-2 rounded-md bg-[#16D39A] px-3 py-1.5 text-xs font-semibold text-[#090B0B] hover:bg-[#16D39A]/90 disabled:opacity-50"
                >
                  {creando && <Loader2 className="h-3 w-3 animate-spin" />}
                  Guardar y Seleccionar
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
