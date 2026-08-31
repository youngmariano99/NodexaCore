"use client";

import { useState } from "react";
import { MessageCircle, Search, ArrowUpDown, ExternalLink } from "lucide-react";

import type { ClientePadronEnriquecido, MovimientoLibroDiario } from "@/repositories/cuentasCorrientesDashboardRepository";
import { ModalFichaClienteRapida } from "./ModalFichaClienteRapida";

interface PadronClientesTablaProps {
  clientes: ClientePadronEnriquecido[];
  movimientosTodos?: MovimientoLibroDiario[];
  nombreComercio?: string;
}

export function PadronClientesTabla({
  clientes,
  movimientosTodos = [],
  nombreComercio = "Comercio",
}: PadronClientesTablaProps) {
  const [busqueda, setBusqueda] = useState("");
  const [ordenCampo, setOrdenCampo] = useState<"ranking" | "saldoActual" | "nombre">("ranking");
  const [ordenAsc, setOrdenAsc] = useState(true);

  // Cliente seleccionado para abrir la Ficha Rápida en modal
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClientePadronEnriquecido | null>(null);

  const formatearPrecio = (monto: number) => {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(monto);
  };

  const abrirWhatsApp = (e: React.MouseEvent, nombre: string, telefono: string | null, saldo: number) => {
    e.stopPropagation();
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

  const movimientosDelClienteSeleccionado = clienteSeleccionado
    ? movimientosTodos.filter((m) => m.clienteFinalId === clienteSeleccionado.clienteFinalId)
    : [];

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de Búsqueda y Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, teléfono o ID de cliente..."
            className="w-full rounded-xl border border-[#222A27] bg-[#111615] pl-9 pr-4 py-2.5 text-xs text-slate-50 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Ordenar por:</span>
          <button
            type="button"
            onClick={() => cambiarOrden("ranking")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-2xs font-semibold border transition-all ${
              ordenCampo === "ranking"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold"
                : "border-[#222A27] bg-[#111615] text-slate-300 hover:text-slate-100"
            }`}
          >
            <span>Ranking Deuda</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => cambiarOrden("nombre")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-2xs font-semibold border transition-all ${
              ordenCampo === "nombre"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold"
                : "border-[#222A27] bg-[#111615] text-slate-300 hover:text-slate-100"
            }`}
          >
            <span>Nombre</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Tabla Enriquecida */}
      <div className="overflow-x-auto rounded-2xl border border-[#222A27] bg-[#111615] shadow-2xl">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#222A27] bg-[#090B0B] text-slate-300 uppercase tracking-wider text-3xs font-bold">
              <th className="px-4 py-3.5 text-center">Rank</th>
              <th className="px-4 py-3.5">ID</th>
              <th className="px-4 py-3.5">Cliente</th>
              <th className="px-4 py-3.5">Teléfono</th>
              <th className="px-4 py-3.5 text-right">Límite Crédito</th>
              <th className="px-4 py-3.5 text-right">Comprado</th>
              <th className="px-4 py-3.5 text-right">Cobrado</th>
              <th className="px-4 py-3.5 text-right">Saldo Actual</th>
              <th className="px-4 py-3.5 text-center">% Usado</th>
              <th className="px-4 py-3.5 text-center">Estado Alerta</th>
              <th className="px-4 py-3.5 text-center">Días s/Pagar</th>
              <th className="px-4 py-3.5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222A27] text-slate-100">
            {clientesOrdenados.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-slate-400">
                  No se encontraron clientes registrados en el padrón.
                </td>
              </tr>
            ) : (
              clientesOrdenados.map((c) => (
                <tr
                  key={c.clienteFinalId}
                  onClick={() => setClienteSeleccionado(c)}
                  className="hover:bg-[#1A211F] cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-400">
                    #{c.ranking}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-2xs text-slate-500">
                    {c.clienteFinalId.substring(0, 8)}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-slate-50">
                    <div className="flex items-center gap-1.5 group">
                      <span className="group-hover:text-emerald-400 transition-colors">{c.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {c.telefono ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-300 font-mono text-2xs">{c.telefono}</span>
                        <button
                          type="button"
                          onClick={(e) => abrirWhatsApp(e, c.nombre, c.telefono, c.saldoActual)}
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
                  <td className="px-4 py-3.5 text-right font-mono text-slate-300">
                    {c.limiteCredito > 0 ? formatearPrecio(c.limiteCredito) : "Sin Límite"}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-slate-300">
                    {formatearPrecio(c.totalComprado)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-emerald-400 font-bold">
                    {formatearPrecio(c.totalCobrado)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-sm font-bold text-amber-400">
                    {formatearPrecio(c.saldoActual)}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {c.limiteCredito > 0 ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-mono text-3xs font-semibold text-slate-200">
                          {c.porcentajeLimiteUsado}%
                        </span>
                        <div className="w-16 bg-[#090B0B] rounded-full h-1.5 overflow-hidden border border-[#222A27]">
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
                    ) : (
                      <span className="text-3xs font-medium text-slate-500 italic">Sin Límite</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {c.estadoAlerta === "al_dia" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-3xs font-bold text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                        Al día
                      </span>
                    )}
                    {c.estadoAlerta === "precaucion" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-3xs font-bold text-amber-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                        Atención
                      </span>
                    )}
                    {c.estadoAlerta === "excedido" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/30 px-2 py-0.5 text-3xs font-bold text-red-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                        Excedido
                      </span>
                    )}
                    {c.estadoAlerta === "suspendido" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#222A27] px-2 py-0.5 text-3xs font-bold text-slate-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                        Suspendido
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center font-mono text-2xs text-slate-300">
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
                  <td className="px-4 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setClienteSeleccionado(c);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#222A27] bg-[#090B0B] px-2.5 py-1 text-2xs font-bold text-slate-200 hover:bg-[#222A27] hover:text-emerald-400 transition-colors"
                    >
                      <span>Ficha</span>
                      <ExternalLink className="h-3 w-3 text-slate-400" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Ficha Rápida de Cliente */}
      {clienteSeleccionado && (
        <ModalFichaClienteRapida
          cliente={clienteSeleccionado}
          movimientosCliente={movimientosDelClienteSeleccionado}
          nombreComercio={nombreComercio}
          onClose={() => setClienteSeleccionado(null)}
        />
      )}
    </div>
  );
}
