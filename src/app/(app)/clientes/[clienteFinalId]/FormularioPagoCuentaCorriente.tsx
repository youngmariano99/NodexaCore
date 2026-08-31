"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";

import { MensajeError } from "@/components/errores/MensajeError";
import { ComprobanteCobroTicket } from "@/components/fiados/ComprobanteCobroTicket";
import { registrarPagoCuentaCorriente } from "@/services/fiados/registrarPagoCuentaCorriente";
import { ESTADO_REGISTRAR_PAGO_CUENTA_CORRIENTE_INICIAL } from "@/services/fiados/tipos";
import { useToast } from "@/components/ui/Toast";
import { InputDinero } from "@/components/ui/InputDinero";

interface ItemDebitoOpcion {
  movimientoCcId: string;
  montoPendiente: number;
  comprobanteTipo: string;
  numeroComprobante?: string | null;
}

interface TicketEmitidoState {
  numeroRecibo: string;
  monto: number;
  metodoPago: string;
  saldoDeudorRestante: number;
}

interface FormularioPagoCuentaCorrienteProps {
  clienteFinalId: string;
  saldoDeudor: number;
  nombreComercio?: string;
  nombreCliente?: string;
  telefonoCliente?: string | null;
  debitoEspecificoId?: string;
  montoSugerido?: number;
  debitosPendientes?: ItemDebitoOpcion[];
}

export function FormularioPagoCuentaCorriente({
  clienteFinalId,
  saldoDeudor,
  nombreComercio = "Nodexa Comercio",
  nombreCliente = "Cliente Final",
  telefonoCliente,
  debitoEspecificoId: debitoEspecificoIdProp,
  montoSugerido,
  debitosPendientes = [],
}: FormularioPagoCuentaCorrienteProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [monto, setMonto] = useState(montoSugerido ? String(montoSugerido) : "");
  const [metodoPago, setMetodoPago] = useState<string>("efectivo");
  const [debitoEspecificoId, setDebitoEspecificoId] = useState(debitoEspecificoIdProp || "");
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Estado del ticket generado
  const [ticketEmitido, setTicketEmitido] = useState<TicketEmitidoState | null>(null);

  const handleOpen = () => {
    setMonto(montoSugerido ? String(montoSugerido) : "");
    setMetodoPago("efectivo");
    setDebitoEspecificoId(debitoEspecificoIdProp || "");
    setErrorLocal(null);
    setTicketEmitido(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (!isPending) {
      setIsOpen(false);
      setTicketEmitido(null);
      setErrorLocal(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    const montoNum = Number(monto.replace(/\./g, "").replace(",", "."));

    if (isNaN(montoNum) || montoNum <= 0) {
      setErrorLocal("NX-SYS-006");
      return;
    }

    if (montoNum > saldoDeudor) {
      setErrorLocal("NX-FIA-003");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("cliente_final_id", clienteFinalId);
      formData.append("monto", String(montoNum));
      formData.append("metodo_pago", metodoPago);
      if (debitoEspecificoId) {
        formData.append("debito_especifico_id", debitoEspecificoId);
      }

      const resultado = await registrarPagoCuentaCorriente(
        ESTADO_REGISTRAR_PAGO_CUENTA_CORRIENTE_INICIAL,
        formData
      );

      if (resultado.exito) {
        toast.exito("Pago registrado exitosamente.");
        const saldoRestante = Math.max(0, Number((saldoDeudor - montoNum).toFixed(2)));
        setTicketEmitido({
          numeroRecibo: `REC-${Date.now().toString().slice(-6)}`,
          monto: montoNum,
          metodoPago,
          saldoDeudorRestante: saldoRestante,
        });
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
        className="flex min-h-11 items-center rounded-xl bg-[#16D39A] px-4 text-sm font-bold text-slate-950 transition-colors duration-150 hover:bg-[#13b885] focus:outline-none focus:ring-2 focus:ring-[#16D39A] focus:ring-offset-2 focus:ring-offset-[#090B0B] disabled:opacity-40 disabled:pointer-events-none"
      >
        Registrar Pago
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090B0B]/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#222A27] bg-[#0D1110] p-6 text-slate-50 shadow-2xl">
            {ticketEmitido ? (
              <ComprobanteCobroTicket
                nombreComercio={nombreComercio}
                nombreCliente={nombreCliente}
                telefonoCliente={telefonoCliente ?? undefined}
                numeroRecibo={ticketEmitido.numeroRecibo}
                fecha={new Date().toLocaleDateString("es-AR")}
                montoCobrado={ticketEmitido.monto}
                metodoPago={ticketEmitido.metodoPago}
                saldoDeudorRestante={ticketEmitido.saldoDeudorRestante}
                onCerrar={handleClose}
              />
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-[#222A27] pb-3">
                  <h2 className="text-base font-bold text-slate-50">Registrar Pago</h2>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isPending}
                    className="rounded-lg p-1 text-slate-400 hover:bg-[#111615] hover:text-slate-100 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
                  {errorLocal && <MensajeError codigo={errorLocal} className="w-full" />}

                  <div className="rounded-xl bg-[#111615] border border-[#222A27] p-3 text-xs text-slate-400 flex flex-col gap-0.5">
                    <span>Saldo Deudor Vigente:</span>
                    <span className="text-base font-bold text-[#16D39A] font-mono">
                      ${saldoDeudor.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Monto */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Monto del Pago
                    </label>

                    <InputDinero
                      id="monto"
                      name="monto"
                      required
                      value={monto}
                      onValueChange={(val) => setMonto(String(val))}
                      placeholder="0.00"
                      disabled={isPending}
                    />
                  </div>

                  {/* Forma de Pago */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Forma de Pago Real:
                    </label>
                    <select
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                      disabled={isPending}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia Bancaria</option>
                      <option value="tarjeta">Tarjeta de Débito/Crédito</option>
                      <option value="mercado_pago">Mercado Pago</option>
                    </select>
                  </div>

                  {/* Imputación Específica u Orden FIFO */}
                  {debitosPendientes.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-300">
                        Imputación del Pago (Opcional):
                      </label>
                      <select
                        value={debitoEspecificoId}
                        onChange={(e) => setDebitoEspecificoId(e.target.value)}
                        disabled={isPending}
                        className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="">Automática (FIFO - Facturas más antiguas primero)</option>
                        {debitosPendientes.map((d) => (
                          <option key={d.movimientoCcId} value={d.movimientoCcId}>
                            Saldar {d.numeroComprobante || d.comprobanteTipo} (${d.montoPendiente.toLocaleString("es-AR")})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Botones */}
                  <div className="flex justify-end gap-2 border-t border-slate-800 pt-4 mt-1">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isPending}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 flex items-center justify-center min-w-[120px]"
                    >
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
                    </button>
                  </div>

                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
