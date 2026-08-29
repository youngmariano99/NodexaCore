"use client";

import { useState } from "react";
import Link from "next/link";
import {
  X,
  User,
  MessageCircle,
  ExternalLink,
  ArrowDownRight,
  ArrowUpRight,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";


import type { ClientePadronEnriquecido, MovimientoLibroDiario } from "@/repositories/cuentasCorrientesDashboardRepository";
import { FormularioPagoCuentaCorriente } from "@/app/(app)/clientes/[clienteFinalId]/FormularioPagoCuentaCorriente";

interface ModalFichaClienteRapidaProps {
  cliente: ClientePadronEnriquecido;
  movimientosCliente: MovimientoLibroDiario[];
  nombreComercio?: string;
  onClose: () => void;
}

export function ModalFichaClienteRapida({
  cliente,
  movimientosCliente,
  nombreComercio = "Comercio",
  onClose,
}: ModalFichaClienteRapidaProps) {
  const [tabActual, setTabActual] = useState<"resumen" | "movimientos">("resumen");

  const formatearPrecio = (monto: number) => {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(monto);
  };

  const formatearFecha = (fechaStr: string | null) => {
    if (!fechaStr) return "Sin registros";
    return new Date(fechaStr).toLocaleDateString("es-AR", { dateStyle: "medium" });
  };

  const abrirWhatsApp = () => {
    if (!cliente.telefono) return;
    const telefonoLimpio = cliente.telefono.replace(/\D/g, "");
    const mensaje = `Hola ${cliente.nombre}, te escribimos de *${nombreComercio}*. Te recordamos que tu saldo en cuenta corriente es de *${formatearPrecio(
      cliente.saldoActual
    )}*.\n\nPodés abonar por Transferencia o pasar por el local. ¡Muchas gracias!`;

    window.open(`https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`, "_blank");
  };

  const debitosParaPago = movimientosCliente
    .filter((m) => m.tipo === "cargo" && m.montoPendiente > 0)
    .map((m) => ({
      movimientoCcId: m.movimientoCcId,
      montoPendiente: m.montoPendiente,
      comprobanteTipo: m.comprobanteTipo,
      numeroComprobante: m.numeroComprobante,
    }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090B0B]/80 p-4 backdrop-blur-md">
      <div className="flex w-full max-w-2xl flex-col max-h-[90vh] overflow-hidden rounded-2xl border border-[#222A27] bg-[#111615] text-slate-100 shadow-2xl">
        {/* Encabezado del Modal */}
        <div className="flex items-center justify-between border-b border-[#222A27] bg-[#090B0B] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
              <User className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-base font-bold text-slate-50 flex items-center gap-2">
                <span>{cliente.nombre}</span>
                <span className="text-3xs font-mono text-slate-500">#{cliente.clienteFinalId.substring(0, 8)}</span>
              </h2>
              <span className="text-2xs text-slate-400">
                Ficha rápida de cuenta corriente • Ranking #{cliente.ranking}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-[#222A27] hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Barra de Acciones Rápidas */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222A27] bg-[#111615] px-6 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTabActual("resumen")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                tabActual === "resumen"
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-[#090B0B] text-slate-400 hover:text-slate-200 border border-[#222A27]"
              }`}
            >
              Resumen Cuenta
            </button>
            <button
              type="button"
              onClick={() => setTabActual("movimientos")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                tabActual === "movimientos"
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-[#090B0B] text-slate-400 hover:text-slate-200 border border-[#222A27]"
              }`}
            >
              Historial ({movimientosCliente.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {cliente.saldoActual > 0 && (
              <FormularioPagoCuentaCorriente
                clienteFinalId={cliente.clienteFinalId}
                nombreCliente={cliente.nombre}
                telefonoCliente={cliente.telefono}
                nombreComercio={nombreComercio}
                saldoDeudor={cliente.saldoActual}
                debitosPendientes={debitosParaPago}
              />
            )}

            {cliente.telefono && (
              <button
                type="button"
                onClick={abrirWhatsApp}
                className="flex items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp</span>
              </button>
            )}

            <Link
              href={`/clientes/${cliente.clienteFinalId}`}
              className="flex items-center gap-1 rounded-xl border border-[#222A27] bg-[#090B0B] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-[#222A27] transition-colors"
              title="Abrir ficha completa en pantalla entera"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Cuerpo del Modal */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {tabActual === "resumen" && (
            <div className="flex flex-col gap-6">
              {/* Bloque de KPIs Principales */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1 rounded-xl border border-[#222A27] bg-[#090B0B] p-4">
                  <span className="text-2xs font-semibold text-slate-400">Saldo Deudor Actual</span>
                  <span className="font-mono text-xl font-bold text-amber-400">
                    {formatearPrecio(cliente.saldoActual)}
                  </span>
                  <span className="text-3xs text-slate-500">Monto pendiente a saldar</span>
                </div>

                <div className="flex flex-col gap-1 rounded-xl border border-[#222A27] bg-[#090B0B] p-4">
                  <span className="text-2xs font-semibold text-slate-400">Límite de Crédito</span>
                  <span className="font-mono text-xl font-bold text-slate-200">
                    {cliente.limiteCredito > 0 ? formatearPrecio(cliente.limiteCredito) : "Sin Límite"}
                  </span>
                  <span className="text-3xs text-slate-500">
                    {cliente.limiteCredito > 0 ? `${cliente.porcentajeLimiteUsado}% consumido` : "Sin límite asignado"}
                  </span>
                </div>

                <div className="flex flex-col gap-1 rounded-xl border border-[#222A27] bg-[#090B0B] p-4">
                  <span className="text-2xs font-semibold text-slate-400">Estado Crediticio</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {cliente.estadoAlerta === "al_dia" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-2xs font-bold text-emerald-400">
                        <ShieldCheck className="h-3.5 w-3.5" /> Al día
                      </span>
                    )}
                    {cliente.estadoAlerta === "precaucion" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-2xs font-bold text-amber-400">
                        <ShieldAlert className="h-3.5 w-3.5" /> Cerca del límite
                      </span>
                    )}
                    {cliente.estadoAlerta === "excedido" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/30 px-2.5 py-1 text-2xs font-bold text-red-400">
                        <ShieldAlert className="h-3.5 w-3.5" /> Excedido
                      </span>
                    )}
                    {cliente.estadoAlerta === "suspendido" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#222A27] px-2.5 py-1 text-2xs font-bold text-slate-400">
                        ⛔ Cuenta Suspendida
                      </span>
                    )}
                  </div>
                  <span className="text-3xs text-slate-500">
                    {cliente.diasSinPagar > 0 ? `${cliente.diasSinPagar} días sin abono` : "Al día"}
                  </span>
                </div>
              </div>

              {/* Acumulados Históricos */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="flex flex-col gap-1 rounded-xl border border-[#222A27] bg-[#090B0B] p-4">
                  <span className="text-slate-400">Total Comprado Histórico (Fiado):</span>
                  <span className="font-mono text-base font-bold text-slate-100">
                    {formatearPrecio(cliente.totalComprado)}
                  </span>
                  <span className="text-3xs text-slate-500">
                    Última compra: {formatearFecha(cliente.ultimaCompraFecha)}
                  </span>
                </div>

                <div className="flex flex-col gap-1 rounded-xl border border-[#222A27] bg-[#090B0B] p-4">
                  <span className="text-slate-400">Total Cobrado Histórico (Abonos):</span>
                  <span className="font-mono text-base font-bold text-emerald-400">
                    {formatearPrecio(cliente.totalCobrado)}
                  </span>
                  <span className="text-3xs text-slate-500">Plata que ya ingresó a la caja</span>
                </div>
              </div>

              {/* Barra de progreso de crédito */}
              {cliente.limiteCredito > 0 && (
                <div className="flex flex-col gap-2 rounded-xl border border-[#222A27] bg-[#090B0B] p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">Uso del Límite de Crédito:</span>
                    <span className="font-mono font-bold text-slate-100">{cliente.porcentajeLimiteUsado}%</span>
                  </div>
                  <div className="w-full bg-[#111615] rounded-full h-2.5 overflow-hidden border border-[#222A27]">
                    <div
                      className={`h-full transition-all ${
                        cliente.porcentajeLimiteUsado > 100
                          ? "bg-red-500"
                          : cliente.porcentajeLimiteUsado >= 80
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, cliente.porcentajeLimiteUsado)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {tabActual === "movimientos" && (
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Historial de Comprobantes
              </h3>

              {movimientosCliente.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  Este cliente no registra movimientos de cuenta corriente todavía.
                </p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-[#222A27] bg-[#090B0B]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#222A27] bg-[#111615] text-slate-400">
                        <th className="px-3 py-2.5 font-semibold">Fecha</th>
                        <th className="px-3 py-2.5 font-semibold">Tipo</th>
                        <th className="px-3 py-2.5 font-semibold">Comprobante</th>
                        <th className="px-3 py-2.5 font-semibold text-right">Monto ($)</th>
                        <th className="px-3 py-2.5 font-semibold text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222A27] text-slate-200">
                      {movimientosCliente.map((m) => (
                        <tr key={m.movimientoCcId} className="hover:bg-[#111615]">
                          <td className="px-3 py-2 font-mono text-3xs text-slate-400">
                            {new Date(m.creadoEn).toLocaleDateString("es-AR", { dateStyle: "short" })}
                          </td>
                          <td className="px-3 py-2">
                            {m.tipo === "pago" ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-3xs">
                                <ArrowDownRight className="h-3 w-3" /> Pago
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-400 font-semibold text-3xs">
                                <ArrowUpRight className="h-3 w-3" /> Cargo
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-mono text-3xs text-slate-300">
                            {m.numeroComprobante ?? m.comprobanteTipo}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-100">
                            {m.tipo === "pago" ? "−" : "+"}{formatearPrecio(m.monto)}
                          </td>
                          <td className="px-3 py-2 text-center text-3xs">
                            {m.estadoImputacion === "total" && (
                              <span className="text-emerald-400 font-semibold">Saldado</span>
                            )}
                            {m.estadoImputacion === "parcial" && (
                              <span className="text-amber-400 font-semibold">
                                Pend. (${m.montoPendiente.toLocaleString("es-AR")})
                              </span>
                            )}
                            {m.estadoImputacion === "pendiente" && (
                              <span className="text-slate-400 font-semibold">Pendiente</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
