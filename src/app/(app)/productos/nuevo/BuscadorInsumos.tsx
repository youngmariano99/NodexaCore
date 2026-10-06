"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Loader2 } from "lucide-react";
import { crearClienteSupabaseNavegador } from "@/lib/supabase/client";

interface Insumo {
  producto_id: string;
  sku: string;
  nombre: string;
  precio: number;
}

interface BuscadorInsumosProps {
  onSeleccionar: (insumo: Insumo) => void;
}

const CLASES_INPUT = "flex h-11 w-full rounded-md border border-[#222A27] bg-[#090B0B] px-3 py-2 text-sm text-[#F3F5F4] outline-none transition-colors placeholder:text-[#A6AEAA] focus:border-[#16D39A] focus:ring-1 focus:ring-[#16D39A] disabled:cursor-not-allowed disabled:opacity-50";

export function BuscadorInsumos({ onSeleccionar }: BuscadorInsumosProps) {
  const [termino, setTermino] = useState("");
  const [resultados, setResultados] = useState<Insumo[]>([]);
  const [buscando, setBuscando] = useState(false);
  const supabase = crearClienteSupabaseNavegador();

  useEffect(() => {
    if (!termino || termino.length < 2) {
      setResultados([]);
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

  return (
    <div className="flex flex-col gap-2 relative">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-[#A6AEAA]" />
        <input
          type="text"
          placeholder="Buscar insumo por nombre..."
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
          className={`${CLASES_INPUT} pl-9`}
        />
        {buscando && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-[#16D39A]" />}
      </div>
      
      {resultados.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-60 overflow-y-auto rounded-md border border-[#222A27] bg-[#090B0B] shadow-lg">
          {resultados.map((insumo) => (
            <button
              key={insumo.producto_id}
              type="button"
              className="flex w-full items-center justify-between px-4 py-2 hover:bg-[#151A18] text-left"
              onClick={() => {
                onSeleccionar(insumo);
                setTermino("");
                setResultados([]);
              }}
            >
              <div>
                <div className="text-sm font-medium text-[#F3F5F4]">{insumo.nombre}</div>
                <div className="text-xs text-[#A6AEAA]">{insumo.sku} - ${insumo.precio}</div>
              </div>
              <Plus className="h-4 w-4 text-[#16D39A]" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
