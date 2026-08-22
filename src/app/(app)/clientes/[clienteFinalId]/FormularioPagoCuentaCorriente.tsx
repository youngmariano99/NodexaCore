"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";

import { MensajeError } from "@/components/errores/MensajeError";
import { registrarPagoCuentaCorriente } from "@/services/fiados/registrarPagoCuentaCorriente";
import { ESTADO_REGISTRAR_PAGO_CUENTA_CORRIENTE_INICIAL } from "@/services/fiados/tipos";

interface FormularioPagoCuentaCorrienteProps {
  clienteFinalId: string;
  saldoDeudor: number;
}

export function FormularioPagoCuentaCorriente({
  clienteFinalId,
  saldoDeudor,
}: FormularioPagoCuentaCorrienteProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [monto, setMonto] = useState("");
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpen = () => {
    setMonto("");
    setErrorLocal(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (!isPending) {
      setIsOpen(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    const montoNum = Number(monto);

    // Validar en cliente y aplicar patrones Fail-Fast
    if (!monto || Number.isNaN(montoNum)) {
      setErrorLocal("NX-FIA-004");
      return;
    }

    if (montoNum <= 0) {
      setErrorLocal("NX-FIA-004");
      return;
    }

    // Paso 4: Validar en cliente que el monto de pago no exceda el saldo deudor actual
    if (montoNum > saldoDeudor) {
      setErrorLocal("NX-FIA-003");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("cliente_final_id", clienteFinalId);
      formData.append("monto", String(montoNum));

      const resultado = await registrarPagoCuentaCorriente(
        ESTADO_REGISTRAR_PAGO_CUENTA_CORRIENTE_INICIAL,
        formData
      );

      if (resultado.exito) {
        setIsOpen(false);
        router.refresh();
      } else {
        setErrorLocal(resultado.error);
      }
    });
  };

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={saldoDeudor <= 0}
        className="flex min-h-11 items-center rounded-md bg-emerald-500 px-4 text-sm font-semibold text-slate-950 transition-colors duration-150 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-40 disabled:pointer-events-none"
      >
        Registrar Pago
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-6 text-slate-50 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-lg font-semibold text-slate-50">Registrar Pago</h2>
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
              {errorLocal && (
                <MensajeError codigo={errorLocal} className="w-full" />
              )}

              <div className="rounded-md bg-slate-800/40 border border-slate-800 px-3 py-2.5 text-xs text-slate-400 flex flex-col gap-0.5">
                <span>Saldo Deudor Actual:</span>
                <span className="text-sm font-semibold text-slate-100 font-mono">
                  ${saldoDeudor.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Monto */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Monto del Pago
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-mono">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="0.00"
                    disabled={isPending}
                    className="w-full rounded-md border border-slate-700 bg-slate-800 pl-7 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-2 border-t border-slate-800 pt-4 mt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="rounded-md border border-slate-700 bg-transparent px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition-colors flex items-center justify-center min-w-[100px]"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Confirmar"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
