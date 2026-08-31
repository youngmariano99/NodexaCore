"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  Building2,
  CreditCard,
  UserCheck,
  Percent,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Smartphone,
} from "lucide-react";

import {
  type ReglaMetodoPago,
  type TipoAjustePago,
  normalizarReglasMetodosPago,
} from "@/lib/dominio/ventas/calcularTotalVenta";
import { actualizarMetodosPago } from "@/services/configuracion/actualizarMetodosPago";

interface FormularioMetodosPagoProps {
  metodosIniciales: ReglaMetodoPago[] | null;
}

function obtenerIconoMetodo(metodoPago: string) {
  switch (metodoPago) {
    case "efectivo":
      return <Banknote className="h-5 w-5 text-emerald-400" />;
    case "transferencia":
      return <Building2 className="h-5 w-5 text-blue-400" />;
    case "debito":
      return <CreditCard className="h-5 w-5 text-sky-400" />;
    case "credito":
      return <CreditCard className="h-5 w-5 text-purple-400" />;
    case "cuenta_corriente":
      return <UserCheck className="h-5 w-5 text-amber-400" />;
    default:
      return <Smartphone className="h-5 w-5 text-slate-400" />;
  }
}

export function FormularioMetodosPago({ metodosIniciales }: FormularioMetodosPagoProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [reglas, setReglas] = useState<ReglaMetodoPago[]>(() => {
    return normalizarReglasMetodosPago(metodosIniciales);
  });

  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [isPending, startTransition] = useTransition();

  const actualizarRegla = (
    index: number,
    campo: keyof ReglaMetodoPago,
    valor: string | number | boolean
  ) => {
    setReglas((prev) => {
      const nuevo = [...prev];
      const item = { ...nuevo[index]! };

      if (campo === "tipoAjuste") {
        item.tipoAjuste = valor as TipoAjustePago;
        if (valor === "ninguno") {
          item.porcentaje = 0;
        }
      } else if (campo === "porcentaje") {
        const num = Math.max(0, Math.min(Number(valor) || 0, 100));
        item.porcentaje = num;
      } else if (campo === "activo") {
        item.activo = Boolean(valor);
      } else if (campo === "etiqueta") {
        item.etiqueta = String(valor);
      }

      nuevo[index] = item;
      return nuevo;
    });
    setExito(false);
    setErrorLocal(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);
    setExito(false);

    // Validar que al menos un método esté activo
    if (!reglas.some((r) => r.activo)) {
      setErrorLocal("Debes tener habilitado al menos un método de pago.");
      return;
    }

    startTransition(async () => {
      const res = await actualizarMetodosPago(reglas);
      if (res.ok) {
        setExito(true);
        await queryClient.invalidateQueries({ queryKey: ["metodos-pago-comercio"] });
        router.refresh();
      } else {
        setErrorLocal(res.error || "NX-SYS-001");
      }
    });
  };

  return (
    <section className="flex flex-col gap-6 rounded-lg border border-[#222A27] bg-[#111615] p-6 shadow-sm">
      <div className="flex flex-col gap-1 border-b border-[#222A27] pb-4">
        <div className="flex items-center gap-2">
          <Percent className="h-5 w-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-slate-100">Métodos de Pago y Promociones</h2>
        </div>
        <p className="text-sm text-slate-400">
          Configurá los medios de cobro disponibles en el Mostrador y asigná descuentos o recargos automáticos.
        </p>
      </div>

      {errorLocal ? (
        <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorLocal}</span>
        </div>
      ) : null}

      {exito ? (
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Métodos de pago y promociones actualizados con éxito.</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col divide-y divide-[#222A27]">
          {reglas.map((regla, index) => {
            return (
              <div
                key={regla.metodoPago}
                className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#222A27] bg-[#151A18]">
                    {obtenerIconoMetodo(regla.metodoPago)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-100">{regla.etiqueta}</span>
                    <span className="font-mono text-xs text-slate-400">
                      ID: <span className="text-slate-300">{regla.metodoPago}</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Selector de tipo de ajuste */}
                  <select
                    value={regla.tipoAjuste}
                    onChange={(e) => actualizarRegla(index, "tipoAjuste", e.target.value)}
                    disabled={!regla.activo}
                    aria-label={`Tipo de ajuste para ${regla.etiqueta}`}
                    className="min-h-11 rounded-md border border-[#222A27] bg-[#151A18] px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none disabled:opacity-40"
                  >
                    <option value="ninguno">Precio de lista (Sin ajuste)</option>
                    <option value="descuento">Descuento (%)</option>
                    <option value="recargo">Recargo (%)</option>
                  </select>

                  {/* Input porcentaje */}
                  {regla.tipoAjuste !== "ninguno" ? (
                    <div className="relative w-28">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={regla.porcentaje}
                        onChange={(e) => actualizarRegla(index, "porcentaje", e.target.value)}
                        disabled={!regla.activo}
                        placeholder="0"
                        aria-label={`Porcentaje para ${regla.etiqueta}`}
                        className="min-h-11 w-full rounded-md border border-[#222A27] bg-[#151A18] py-2 pl-3 pr-8 font-mono text-sm text-slate-100 focus:border-emerald-500 focus:outline-none disabled:opacity-40"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400">
                        %
                      </span>
                    </div>
                  ) : null}

                  {/* Switch activo */}
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 px-2 text-xs font-medium text-slate-300">
                    <input
                      type="checkbox"
                      checked={regla.activo}
                      onChange={(e) => actualizarRegla(index, "activo", e.target.checked)}
                      className="h-4 w-4 rounded border-[#222A27] bg-[#151A18] text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>{regla.activo ? "Habilitado" : "Deshabilitado"}</span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-4 border-t border-[#222A27]">
          <button
            type="submit"
            disabled={isPending}
            className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#16D39A] px-6 py-2.5 text-sm font-semibold text-slate-950 transition-colors duration-150 hover:bg-[#13b584] disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Guardando cambios...</span>
              </>
            ) : (
              <span>Guardar Métodos de Pago</span>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
