"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2, Plus, Loader2, Save } from "lucide-react";
import { crearClienteSupabaseNavegador } from "@/lib/supabase/client";

const esquemaCosto = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  tipo_calculo: z.enum(["fijo", "porcentaje"]),
  valor: z.number({ coerce: true }).min(0, "Debe ser mayor o igual a 0"),
});

type FormCosto = z.infer<typeof esquemaCosto>;

export interface CostoIndirecto {
  costo_indirecto_id: string;
  nombre: string;
  tipo_calculo: "fijo" | "porcentaje";
  valor: number;
}

export function ConfiguracionGastronomia() {
  const [costos, setCostos] = useState<CostoIndirecto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [margenMeta, setMargenMeta] = useState<string>("30");
  const [guardandoMargen, setGuardandoMargen] = useState(false);

  const supabase = crearClienteSupabaseNavegador();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormCosto>({
    resolver: zodResolver(esquemaCosto),
    defaultValues: { tipo_calculo: "porcentaje", valor: 0 }
  });

  async function cargarDatos() {
    setCargando(true);
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
        if (data) setCostos(data as CostoIndirecto[]);
      }
    }
    setCargando(false);
  }

  useEffect(() => {
    setTimeout(() => cargarDatos(), 0);
    const margenGuardado = localStorage.getItem("nodexa_margen_meta");
    if (margenGuardado) {
      setTimeout(() => setMargenMeta(margenGuardado), 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const agregarCosto = async (data: FormCosto) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { data: userData } = await supabase.from("usuarios").select("cliente_id").eq("auth_user_id", user.user.id).single();
    if (!userData?.cliente_id) return;

    const { error } = await supabase.from("costos_indirectos").insert({
      cliente_id: userData.cliente_id,
      nombre: data.nombre,
      tipo_calculo: data.tipo_calculo,
      valor: data.valor,
    });

    if (!error) {
      reset();
      setTimeout(() => cargarDatos(), 0);
    }
  };

  const eliminarCosto = async (id: string) => {
    const { error } = await supabase
      .from("costos_indirectos")
      .update({ eliminado_en: new Date().toISOString() })
      .eq("costo_indirecto_id", id);
    
    if (!error) {
      setCostos((prev) => prev.filter((c) => c.costo_indirecto_id !== id));
    }
  };

  const guardarMargen = () => {
    setGuardandoMargen(true);
    localStorage.setItem("nodexa_margen_meta", margenMeta);
    setTimeout(() => setGuardandoMargen(false), 500);
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-3xl">
      <section className="flex flex-col gap-4 rounded-lg border border-[#222A27] bg-[#090B0B] p-6">
        <div>
          <h2 className="text-lg font-semibold text-[#F3F5F4]">Margen de Ganancia Meta</h2>
          <p className="text-sm text-[#A6AEAA]">
            Este porcentaje se usarÃ¡ por defecto para sugerirte precios de venta en el Wizard de productos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="number"
              min="0"
              value={margenMeta}
              onChange={(e) => setMargenMeta(e.target.value)}
              className="flex h-11 w-32 rounded-md border border-[#222A27] bg-[#0D1110] px-3 py-2 text-sm text-[#F3F5F4] outline-none focus:border-[#16D39A]"
            />
            <span className="absolute right-3 top-3 text-sm text-[#A6AEAA]">%</span>
          </div>
          <button
            onClick={guardarMargen}
            disabled={guardandoMargen}
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#16D39A] px-5 text-sm font-semibold text-[#090B0B] hover:bg-[#16D39A]/90 transition-colors"
          >
            {guardandoMargen ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar Margen
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-[#222A27] bg-[#090B0B] p-6">
        <div>
          <h2 className="text-lg font-semibold text-[#F3F5F4]">Costos Indirectos</h2>
          <p className="text-sm text-[#A6AEAA]">
            AgregÃ¡ costos dinÃ¡micos como &apos;Fritura&apos;, &apos;Caja&apos;, &apos;Delivery&apos; para aplicarlos fÃ¡cilmente al costear recetas.
          </p>
        </div>

        <form onSubmit={handleSubmit(agregarCosto)} className="flex items-start gap-3 bg-[#0D1110] p-4 rounded-md border border-[#222A27]">
          <div className="flex-1">
            <input
              placeholder="Ej: Packaging"
              {...register("nombre")}
              className="flex h-10 w-full rounded-md border border-[#222A27] bg-[#151A18] px-3 py-2 text-sm text-[#F3F5F4] outline-none focus:border-[#16D39A]"
            />
            {errors.nombre && <p className="mt-1 text-xs text-red-500">{errors.nombre.message}</p>}
          </div>
          <div className="w-32">
            <select
              {...register("tipo_calculo")}
              className="flex h-10 w-full rounded-md border border-[#222A27] bg-[#151A18] px-3 py-2 text-sm text-[#F3F5F4] outline-none focus:border-[#16D39A]"
            >
              <option value="porcentaje">Porcentaje (%)</option>
              <option value="fijo">Monto Fijo ($)</option>
            </select>
          </div>
          <div className="w-24">
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("valor")}
              className="flex h-10 w-full rounded-md border border-[#222A27] bg-[#151A18] px-3 py-2 text-sm text-[#F3F5F4] outline-none focus:border-[#16D39A]"
            />
            {errors.valor && <p className="mt-1 text-xs text-red-500">{errors.valor.message}</p>}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-[#16D39A] px-4 text-sm font-semibold text-[#090B0B] hover:bg-[#16D39A]/90 transition-colors"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Agregar
          </button>
        </form>

        <div className="mt-2 flex flex-col gap-2">
          {cargando ? (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#16D39A]" />
            </div>
          ) : costos.length === 0 ? (
            <p className="text-center text-sm text-[#A6AEAA] py-4">No hay costos indirectos configurados.</p>
          ) : (
            costos.map((c) => (
              <div key={c.costo_indirecto_id} className="flex items-center justify-between rounded-md border border-[#222A27] bg-[#0D1110] px-4 py-3">
                <div>
                  <span className="font-medium text-[#F3F5F4]">{c.nombre}</span>
                  <span className="ml-2 text-xs text-[#A6AEAA] uppercase bg-[#151A18] px-2 py-1 rounded">
                    {c.tipo_calculo}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[#F3F5F4]">
                    {c.tipo_calculo === "fijo" ? "$" : ""}{c.valor}{c.tipo_calculo === "porcentaje" ? "%" : ""}
                  </span>
                  <button
                    onClick={() => eliminarCosto(c.costo_indirecto_id)}
                    className="text-red-500 hover:text-red-400 p-1 rounded transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

