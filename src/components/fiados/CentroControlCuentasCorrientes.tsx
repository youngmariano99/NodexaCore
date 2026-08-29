"use client";

import { useState } from "react";
import { LayoutDashboard, Users, BookOpen, Plus } from "lucide-react";

import type { DashboardCuentasCorrientesCompleto } from "@/repositories/cuentasCorrientesDashboardRepository";
import { DashboardRiesgoCaja } from "./DashboardRiesgoCaja";
import { PadronClientesTabla } from "./PadronClientesTabla";
import { LibroDiarioMovimientosTabla } from "./LibroDiarioMovimientosTabla";
import { FormularioCrearClienteFinal } from "@/app/(app)/clientes/FormularioCrearClienteFinal";

interface CentroControlCuentasCorrientesProps {
  datosDashboard: DashboardCuentasCorrientesCompleto;
  nombreComercio?: string;
  esComerciante?: boolean;
}

export function CentroControlCuentasCorrientes({
  datosDashboard,
  nombreComercio = "Comercio",
  esComerciante = true,
}: CentroControlCuentasCorrientesProps) {
  const [tabActiva, setTabActiva] = useState<"dashboard" | "padron" | "libro">("dashboard");

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      {/* Encabezado Principal */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-slate-50 tracking-tight">
            Cuentas Corrientes (Fiados)
          </h1>
          <p className="text-xs text-slate-400">
            Centro de control financiero, gestión de riesgo comercial y cobranza de {nombreComercio}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <FormularioCrearClienteFinal />
        </div>
      </header>

      {/* Navegación por Pestañas Superiores */}
      <nav className="flex rounded-2xl bg-slate-900 p-1.5 border border-slate-800 shadow-lg self-start">
        <button
          type="button"
          onClick={() => setTabActiva("dashboard")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            tabActiva === "dashboard"
              ? "bg-emerald-500 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Dashboard & Riesgo</span>
        </button>

        <button
          type="button"
          onClick={() => setTabActiva("padron")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            tabActiva === "padron"
              ? "bg-emerald-500 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Padrón de Clientes ({datosDashboard.controlClientes.totalClientesPadron})</span>
        </button>

        <button
          type="button"
          onClick={() => setTabActiva("libro")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            tabActiva === "libro"
              ? "bg-emerald-500 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Libro Diario ({datosDashboard.movimientosLibroDiario.length})</span>
        </button>
      </nav>

      {/* Contenido de la Pestaña Activa */}
      <main className="w-full pt-2">
        {tabActiva === "dashboard" && (
          <DashboardRiesgoCaja
            situacionCaja={datosDashboard.situacionCaja}
            controlClientes={datosDashboard.controlClientes}
            semaforoRiesgo={datosDashboard.semaforoRiesgo}
            top5Deudores={datosDashboard.top5Deudores}
            nombreComercio={nombreComercio}
            esComerciante={esComerciante}
          />
        )}

        {tabActiva === "padron" && (
          <PadronClientesTabla
            clientes={datosDashboard.padronClientes}
            nombreComercio={nombreComercio}
          />
        )}

        {tabActiva === "libro" && (
          <LibroDiarioMovimientosTabla movimientos={datosDashboard.movimientosLibroDiario} />
        )}
      </main>
    </div>
  );
}
