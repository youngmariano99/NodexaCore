"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Search, ShieldCheck, Filter } from "lucide-react";

import type { MovimientoLibroDiario } from "@/repositories/cuentasCorrientesDashboardRepository";

interface LibroDiarioMovimientosTablaProps {
  movimientos: MovimientoLibroDiario[];
}

export function LibroDiarioMovimientosTabla({ movimientos }: LibroDiarioMovimientosTablaProps) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "cargo" | "pago">("todos");

  const formatearPrecio = (monto: number) => {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(monto);
  };

  const formatearFecha = (fechaStr: string) => {
    return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(
      new Date(fechaStr)
    );
  };

  const movimientosFiltrados = movimientos.filter((m) => {
    const coincideTipo = filtroTipo === "todos" || m.tipo === filtroTipo;
    const coincideBusqueda =
      m.nombreCliente.toLowerCase().includes(busqueda.toLowerCase()) ||
      (m.numeroComprobante && m.numeroComprobante.toLowerCase().includes(busqueda.toLowerCase())) ||
      m.movimientoCcId.toLowerCase().includes(busqueda.toLowerCase());

    return coincideTipo && coincideBusqueda;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por comprobante, cliente o ID de movimiento..."
            className="w-full rounded-xl border border-[#222A27] bg-[#111615] pl-9 pr-4 py-2.5 text-xs text-slate-50 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Filter className="h-3.5 w-3.5 text-slate-500" />
          <span>Filtrar:</span>
          <button
            type="button"
            onClick={() => setFiltroTipo("todos")}
            className={`rounded-lg px-3 py-1.5 text-2xs font-semibold border transition-all ${
              filtroTipo === "todos"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold"
                : "border-[#222A27] bg-[#111615] text-slate-300 hover:text-slate-100"
            }`}
          >
            Todos ({movimientos.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroTipo("cargo")}
            className={`rounded-lg px-3 py-1.5 text-2xs font-semibold border transition-all ${
              filtroTipo === "cargo"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-400 font-bold"
                : "border-[#222A27] bg-[#111615] text-slate-300 hover:text-slate-100"
            }`}
          >
            Cargos / Facturas
          </button>
          <button
            type="button"
            onClick={() => setFiltroTipo("pago")}
            className={`rounded-lg px-3 py-1.5 text-2xs font-semibold border transition-all ${
              filtroTipo === "pago"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold"
                : "border-[#222A27] bg-[#111615] text-slate-300 hover:text-slate-100"
            }`}
          >
            Pagos / Cobros
          </button>
        </div>
      </div>

      {/* Tabla del Libro Diario */}
      <div className="overflow-x-auto rounded-2xl border border-[#222A27] bg-[#111615] shadow-2xl">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#222A27] bg-[#090B0B] text-slate-300 uppercase tracking-wider text-3xs font-bold">
              <th className="px-4 py-3.5">ID Mov.</th>
              <th className="px-4 py-3.5">Fecha y Hora</th>
              <th className="px-4 py-3.5">Cliente</th>
              <th className="px-4 py-3.5">Tipo</th>
              <th className="px-4 py-3.5">Comprobante / Detalle</th>
              <th className="px-4 py-3.5 text-right">Monto ($)</th>
              <th className="px-4 py-3.5 text-center">Estado Imputación</th>
              <th className="px-4 py-3.5 text-center">Control Contable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222A27] text-slate-100">
            {movimientosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  No hay movimientos registrados en el libro diario.
                </td>
              </tr>
            ) : (
              movimientosFiltrados.map((m) => (
                <tr key={m.movimientoCcId} className="hover:bg-[#1A211F] transition-colors">
                  <td className="px-4 py-3.5 font-mono text-2xs text-slate-500">
                    {m.movimientoCcId.substring(0, 8)}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-2xs text-slate-400">
                    {formatearFecha(m.creadoEn)}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-slate-50">
                    <Link
                      href={`/clientes/${m.clienteFinalId}`}
                      className="hover:text-emerald-400 transition-colors"
                    >
                      {m.nombreCliente}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    {m.tipo === "pago" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-3xs font-bold text-emerald-400">
                        <ArrowDownRight className="h-3 w-3" />
                        Pago / Cobro
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-3xs font-bold text-amber-400">
                        <ArrowUpRight className="h-3 w-3" />
                        Cargo / Venta
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-2xs text-slate-300">
                    {m.numeroComprobante ?? m.comprobanteTipo}
                    {m.metodoPago && (
                      <span className="ml-2 rounded bg-[#090B0B] border border-[#222A27] px-1.5 py-0.5 text-3xs text-slate-400 uppercase">
                        {m.metodoPago}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-sm font-bold text-slate-50">
                    {m.tipo === "pago" ? "−" : "+"}{formatearPrecio(m.monto)}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {m.estadoImputacion === "total" && (
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-3xs font-bold text-emerald-400 border border-emerald-500/30">
                        Total
                      </span>
                    )}
                    {m.estadoImputacion === "parcial" && (
                      <span className="rounded bg-amber-500/10 px-2 py-0.5 text-3xs font-bold text-amber-400 border border-amber-500/30">
                        Parcial (${m.montoPendiente.toLocaleString("es-AR")})
                      </span>
                    )}
                    {m.estadoImputacion === "pendiente" && (
                      <span className="rounded bg-[#090B0B] border border-[#222A27] px-2 py-0.5 text-3xs font-bold text-slate-400">
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-flex items-center gap-1 text-3xs text-emerald-400 font-bold">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Consistente (Auto)
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
