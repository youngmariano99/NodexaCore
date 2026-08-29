"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Search, ArrowUpDown, ChevronRight } from "lucide-react";

import type { ClientePadronEnriquecido } from "@/repositories/cuentasCorrientesDashboardRepository";

interface PadronClientesTablaProps {
  clientes: ClientePadronEnriquecido[];
  nombreComercio?: string;
}

export function PadronClientesTabla({ clientes, nombreComercio = "Comercio" }: PadronClientesTablaProps) {
  const [busqueda, setBusqueda] = useState("");
  const [ordenCampo, setOrdenCampo] = useState<"ranking" | "saldoActual" | "nombre">("ranking");
  const [ordenAsc, setOrdenAsc] = useState(true);

  const formatearPrecio = (monto: number) => {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(monto);
  };


  const abrirWhatsApp = (nombre: string, telefono: string | null, saldo: number) => {
    if (!telefono) return;
    const telefonoLimpio = telefono.replace(/\D/g, "");
    const mensaje = `Hola ${nombre}, te saludamos de *${nombreComercio}*. Te recordamos que tu saldo actual en cuenta corriente es de *${formatearPrecio(
      saldo
    )}*.\n\nPodés abonar por transferencia o pasar por nuestro local. ¡Muchas gracias!`;

    window.open(`https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`, "_blank");
  };

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (c.telefono && c.telefono.includes(busqueda)) ||
      c.clienteFinalId.toLowerCase().includes(busqueda.toLowerCase())
  );

  const clientesOrdenados = [...clientesFiltrados].sort((a, b) => {
    let res = 0;
    if (ordenCampo === "ranking") res = a.ranking - b.ranking;
    else if (ordenCampo === "saldoActual") res = b.saldoActual - a.saldoActual;
    else if (ordenCampo === "nombre") res = a.nombre.localeCompare(b.nombre);
    return ordenAsc ? res : -res;
  });

  const cambiarOrden = (campo: "ranking" | "saldoActual" | "nombre") => {
    if (ordenCampo === campo) {
      setOrdenAsc(!ordenAsc);
    } else {
      setOrdenCampo(campo);
      setOrdenAsc(true);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de Búsqueda y Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, teléfono o ID de cliente..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Ordenar por:</span>
          <button
            type="button"
            onClick={() => cambiarOrden("ranking")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-2xs font-semibold border ${
              ordenCampo === "ranking"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-slate-800 bg-slate-900 text-slate-400"
            }`}
          >
            <span>Ranking Deuda</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => cambiarOrden("nombre")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-2xs font-semibold border ${
              ordenCampo === "nombre"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-slate-800 bg-slate-900 text-slate-400"
            }`}
          >
            <span>Nombre</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Tabla Enriquecida */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950 text-slate-400">
              <th className="px-4 py-3 font-semibold text-center">Rank</th>
              <th className="px-4 py-3 font-semibold">ID</th>
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">Teléfono</th>
              <th className="px-4 py-3 font-semibold text-right">Límite Crédito</th>
              <th className="px-4 py-3 font-semibold text-right">Comprado</th>
              <th className="px-4 py-3 font-semibold text-right">Cobrado</th>
              <th className="px-4 py-3 font-semibold text-right">Saldo Actual</th>
              <th className="px-4 py-3 font-semibold text-center">% Usado</th>
              <th className="px-4 py-3 font-semibold text-center">Estado Alerta</th>
              <th className="px-4 py-3 font-semibold text-center">Días s/Pagar</th>
              <th className="px-4 py-3 font-semibold text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {clientesOrdenados.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-slate-400">
                  No se encontraron clientes registrados en el padrón.
                </td>
              </tr>
            ) : (
              clientesOrdenados.map((c) => (
                <tr key={c.clienteFinalId} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 text-center font-mono font-bold text-slate-400">
                    #{c.ranking}
                  </td>
                  <td className="px-4 py-3 font-mono text-2xs text-slate-500">
                    {c.clienteFinalId.substring(0, 8)}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-100">
                    <Link
                      href={`/clientes/${c.clienteFinalId}`}
                      className="hover:text-emerald-400 flex items-center gap-1 transition-colors"
                    >
                      <span>{c.nombre}</span>
                      <ChevronRight className="h-3 w-3 text-slate-500" />
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {c.telefono ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-300 font-mono text-2xs">{c.telefono}</span>
                        <button
                          type="button"
                          onClick={() => abrirWhatsApp(c.nombre, c.telefono, c.saldoActual)}
                          className="rounded p-1 text-emerald-400 hover:bg-emerald-500/10"
                          title="Enviar mensaje por WhatsApp"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-3xs italic">Sin teléfono</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">
                    {formatearPrecio(c.limiteCredito)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-400">
                    {formatearPrecio(c.totalComprado)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400">
                    {formatearPrecio(c.totalCobrado)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-bold text-amber-400">
                    {formatearPrecio(c.saldoActual)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-mono text-3xs text-slate-300">
                        {c.porcentajeLimiteUsado}%
                      </span>
                      <div className="w-16 bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                        <div
                          className={`h-full transition-all ${
                            c.porcentajeLimiteUsado > 100
                              ? "bg-red-500"
                              : c.porcentajeLimiteUsado >= 80
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(100, c.porcentajeLimiteUsado)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.estadoAlerta === "al_dia" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-3xs font-semibold text-emerald-400">
                        🟢 Al día
                      </span>
                    )}
                    {c.estadoAlerta === "precaucion" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-3xs font-semibold text-amber-400">
                        🟡 Atención
                      </span>
                    )}
                    {c.estadoAlerta === "excedido" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/30 px-2 py-0.5 text-3xs font-semibold text-red-400">
                        🔴 Excedido
                      </span>
                    )}
                    {c.estadoAlerta === "suspendido" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-3xs font-semibold text-slate-400">
                        ⛔ Suspendido
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-2xs text-slate-400">
                    {c.saldoActual > 0 ? (
                      <span
                        className={
                          c.diasSinPagar > 30 ? "font-bold text-red-400" : "text-slate-300"
                        }
                      >
                        {c.diasSinPagar} días
                      </span>
                    ) : (
                      "0 días"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/clientes/${c.clienteFinalId}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-2xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
                    >
                      Ficha
                    </Link>
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
