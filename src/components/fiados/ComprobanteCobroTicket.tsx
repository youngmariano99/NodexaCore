"use client";

import { Printer, MessageCircle, CheckCircle2 } from "lucide-react";

export interface ItemImputacionTicket {
  comprobanteTipo: string;
  numeroComprobante: string;
  montoImputado: number;
  nuevoPendiente: number;
}

export interface ComprobanteCobroTicketProps {
  nombreComercio: string;
  telefonoComercio?: string;
  nombreCliente: string;
  telefonoCliente?: string;
  numeroRecibo: string;
  fecha: string;
  montoCobrado: number;
  metodoPago: string;
  imputaciones?: ItemImputacionTicket[];
  saldoDeudorRestante: number;
  onCerrar?: () => void;
}

export function ComprobanteCobroTicket({
  nombreComercio,
  telefonoComercio,
  nombreCliente,
  telefonoCliente,
  numeroRecibo,
  fecha,
  montoCobrado,
  metodoPago,
  imputaciones = [],
  saldoDeudorRestante,
  onCerrar,
}: ComprobanteCobroTicketProps) {
  const formatearPrecio = (monto: number) => {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(monto);
  };

  const manejarImprimir = () => {
    window.print();
  };

  const manejarEnviarWhatsApp = () => {
    if (!telefonoCliente) return;
    const telefonoLimpio = telefonoCliente.replace(/\D/g, "");
    const mensaje = `*${nombreComercio}* - Recibo de Cobro #${numeroRecibo}\n\n` +
      `Estimado/a ${nombreCliente}, confirmamos el recibo de tu pago de *${formatearPrecio(montoCobrado)}* (${metodoPago}).\n\n` +
      `*Saldo Deudor Restante:* ${formatearPrecio(saldoDeudorRestante)}\n\n` +
      `¡Muchas gracias por mantener tu cuenta al día! ⭐`;

    const url = `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="flex flex-col items-center gap-4 bg-slate-950 p-4 text-slate-100 max-w-sm mx-auto rounded-2xl border border-slate-800 shadow-2xl">
      {/* Botones de Acción (Se ocultan al imprimir) */}
      <div className="flex w-full items-center justify-between border-b border-slate-800 pb-3 print:hidden">
        <button
          type="button"
          onClick={manejarImprimir}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <Printer className="h-3.5 w-3.5 text-[#16D39A]" />
          <span>Imprimir</span>
        </button>

        {telefonoCliente && (
          <button
            type="button"
            onClick={manejarEnviarWhatsApp}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>WhatsApp</span>
          </button>
        )}

        {onCerrar && (
          <button
            type="button"
            onClick={onCerrar}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Cerrar
          </button>
        )}
      </div>

      {/* Ticket Imprimible */}
      <div className="flex w-full flex-col gap-3 rounded-xl border border-slate-800 bg-white p-4 text-slate-900 shadow-inner font-mono text-xs">
        <div className="text-center border-b border-slate-300 pb-2">
          <h2 className="text-base font-bold uppercase tracking-tight">{nombreComercio}</h2>
          {telefonoComercio && <p className="text-2xs text-slate-600">Tel: {telefonoComercio}</p>}
          <p className="text-xs font-bold text-slate-700 mt-1">RECIBO DE COBRO EN CUENTA CORRIENTE</p>
          <span className="text-2xs text-slate-500">#{numeroRecibo}</span>
        </div>

        <div className="flex flex-col gap-0.5 border-b border-slate-300 pb-2 text-2xs">
          <div className="flex justify-between">
            <span className="text-slate-600">Cliente:</span>
            <span className="font-bold">{nombreCliente}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Fecha:</span>
            <span>{fecha}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Medio de Pago:</span>
            <span className="uppercase font-semibold">{metodoPago}</span>
          </div>
        </div>

        {/* Desglose de Facturas / Deudas Imputadas */}
        {imputaciones.length > 0 && (
          <div className="flex flex-col gap-1 border-b border-slate-300 pb-2">
            <span className="text-2xs font-bold uppercase text-slate-600">Deudas Canceladas:</span>
            {imputaciones.map((imp, idx) => (
              <div key={idx} className="flex justify-between text-2xs">
                <span>{imp.numeroComprobante || imp.comprobanteTipo}:</span>
                <span className="font-bold">{formatearPrecio(imp.montoImputado)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Totales */}
        <div className="flex flex-col gap-1 border-b border-slate-300 pb-2">
          <div className="flex justify-between text-xs font-bold text-slate-950">
            <span>MONTO COBRADO:</span>
            <span>{formatearPrecio(montoCobrado)}</span>
          </div>
          <div className="flex justify-between text-xs font-semibold text-slate-700">
            <span>SALDO RESTANTE:</span>
            <span>{formatearPrecio(saldoDeudorRestante)}</span>
          </div>
        </div>

        <div className="text-center pt-1 text-2xs text-slate-500 italic leading-snug">
          Comprobante interno de control comercial.<br />
          Sin validez fiscal / AFIP-ARCA.<br />
          ¡Muchas gracias por su compra!
        </div>
      </div>
    </div>
  );
}
