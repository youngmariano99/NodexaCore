"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  DollarSign,
  Users,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  HelpCircle,
  MessageCircle,
  Settings,
  X,
  Check,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { InputDinero } from "@/components/ui/InputDinero";

import type {
  SituacionCajaYDeuda,
  ControlClientesMetrics,
  SemaforoRiesgoMetrics,
  TopDeudorItem,
  ClientePadronEnriquecido,
  MovimientoLibroDiario,
} from "@/repositories/cuentasCorrientesDashboardRepository";
import { actualizarConfiguracionRiesgoFiados } from "@/services/fiados/actualizarConfiguracionRiesgoFiados";
import { ESTADO_ACTUALIZAR_CONFIGURACION_RIESGO_INICIAL } from "@/services/fiados/tipos";
import { MensajeError } from "@/components/errores/MensajeError";
import { ModalFichaClienteRapida } from "./ModalFichaClienteRapida";

interface DashboardRiesgoCajaProps {
  situacionCaja: SituacionCajaYDeuda;
  controlClientes: ControlClientesMetrics;
  semaforoRiesgo: SemaforoRiesgoMetrics;
  top5Deudores: TopDeudorItem[];
  padronClientes?: ClientePadronEnriquecido[];
  movimientosTodos?: MovimientoLibroDiario[];
  nombreComercio?: string;
  esComerciante?: boolean;
}

export function DashboardRiesgoCaja({
  situacionCaja,
  controlClientes,
  semaforoRiesgo,
  top5Deudores,
  padronClientes = [],
  movimientosTodos = [],
  nombreComercio = "Comercio",
  esComerciante = true,
}: DashboardRiesgoCajaProps) {
  const router = useRouter();
  const [modalAjustesAbierto, setModalAjustesAbierto] = useState(false);
  const [clienteSeleccionadoModal, setClienteSeleccionadoModal] = useState<ClientePadronEnriquecido | null>(null);

  const [isPending, startTransition] = useTransition();
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const [modoState, setModoState] = useState<"automatico" | "manual">(semaforoRiesgo.modoFacturacionEstimada);
  const [manualMonto, setManualMonto] = useState(String(semaforoRiesgo.facturacionManualMonto));
  const [topePct, setTopePct] = useState(String(semaforoRiesgo.topeDeudaTolerablePct));

  const formatearPrecio = (monto: number) => {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(monto);
  };

  const manejarCambiarModo = (nuevoModo: "automatico" | "manual") => {
    setModoState(nuevoModo);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("modo_facturacion_estimada", nuevoModo);
      formData.append("facturacion_manual_monto", manualMonto);
      formData.append("tope_deuda_tolerable_pct", topePct);

      const res = await actualizarConfiguracionRiesgoFiados(
        ESTADO_ACTUALIZAR_CONFIGURACION_RIESGO_INICIAL,
        formData
      );

      if (res.exito) {
        router.refresh();
      }
    });
  };

  const manejarGuardarConfiguracion = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.append("modo_facturacion_estimada", modoState);
      formData.append("facturacion_manual_monto", manualMonto);
      formData.append("tope_deuda_tolerable_pct", topePct);

      const res = await actualizarConfiguracionRiesgoFiados(
        ESTADO_ACTUALIZAR_CONFIGURACION_RIESGO_INICIAL,
        formData
      );

      if (res.exito) {
        setModalAjustesAbierto(false);
        router.refresh();
      } else {
        setErrorLocal(res.error);
      }
    });
  };

  const abrirWhatsAppDeudor = (e: React.MouseEvent, nombreCliente: string, telefono?: string | null, saldo?: number) => {
    e.stopPropagation();
    if (!telefono) return;
    const telefonoLimpio = telefono.replace(/\D/g, "");
    const mensaje = `Hola ${nombreCliente}, te escribimos de *${nombreComercio}*. Te recordamos que tenés un saldo pendiente de *${formatearPrecio(
      saldo ?? 0
    )}* en tu cuenta corriente.\n\nPodés abonar por Transferencia o pasar por nuestro local. ¡Muchas gracias!`;

    window.open(`https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`, "_blank");
  };

  const abrirModalClientePorId = (clienteFinalId: string) => {
    const hallado = padronClientes.find((c) => c.clienteFinalId === clienteFinalId);
    if (hallado) {
      setClienteSeleccionadoModal(hallado);
    }
  };

  const movimientosDelClienteSeleccionado = clienteSeleccionadoModal
    ? movimientosTodos.filter((m) => m.clienteFinalId === clienteSeleccionadoModal.clienteFinalId)
    : [];

  return (
    <div className="flex flex-col gap-8">
      {/* 1. SITUACIÓN DE MI CAJA Y MI DEUDA */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-50 uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-400" />
            Situación de Mi Caja y Mi Deuda
          </h2>
          <span className="text-2xs text-slate-400">Resumen financiero en tiempo real</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1 */}
          <div className="flex flex-col gap-2 rounded-2xl border border-[#222A27] bg-[#111615] p-5 shadow-xl">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-xs font-bold">Caja Total Recuperada</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="font-mono text-2xl font-bold text-emerald-400">
              {formatearPrecio(situacionCaja.cajaTotalRecuperada)}
            </p>
            <div className="flex items-center gap-1.5 text-2xs text-slate-400">
              <HelpCircle className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span>Cobros recibidos que ya volvieron a tu caja</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="flex flex-col gap-2 rounded-2xl border border-[#222A27] bg-[#111615] p-5 shadow-xl">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-xs font-bold">Total Vendido a Crédito</span>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="font-mono text-2xl font-bold text-slate-50">
              {formatearPrecio(situacionCaja.totalVendidoCredito)}
            </p>
            <div className="flex items-center gap-1.5 text-2xs text-slate-400">
              <HelpCircle className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span>Suma de todo lo fiado desde el inicio</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="flex flex-col gap-2 rounded-2xl border border-[#222A27] bg-[#111615] p-5 shadow-xl">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-xs font-bold">Deuda Total en la Calle</span>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>
            <p className="font-mono text-2xl font-bold text-amber-400">
              {formatearPrecio(situacionCaja.deudaTotalCalle)}
            </p>
            <div className="flex items-center gap-1.5 text-2xs text-slate-400">
              <HelpCircle className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span>Dinero afuera pendiente de cobrar</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="flex flex-col gap-2 rounded-2xl border border-[#222A27] bg-[#111615] p-5 shadow-xl">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-xs font-bold">% Fiado Recuperado</span>
              <span className="font-mono text-xs font-bold text-emerald-400">
                {situacionCaja.porcentajeFiadoCobrado}%
              </span>
            </div>
            <div className="w-full bg-[#090B0B] rounded-full h-3 overflow-hidden border border-[#222A27] my-1">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${Math.min(100, situacionCaja.porcentajeFiadoCobrado)}%` }}
              />
            </div>
            <div className="flex items-center gap-1.5 text-2xs text-slate-400">
              <HelpCircle className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span>De cada $100 fiasdos, recuperaste ${situacionCaja.porcentajeFiadoCobrado}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SEMÁFORO DE RIESGO COMERCIAL */}
      <section className="flex flex-col gap-4 rounded-2xl border border-[#222A27] bg-[#111615] p-6 shadow-2xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-[#222A27] pb-4">
          <div className="flex items-center gap-3">
            {semaforoRiesgo.estadoAlertaRiesgo === "saludable" && (
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="h-6 w-6" />
              </div>
            )}
            {semaforoRiesgo.estadoAlertaRiesgo === "precaucion" && (
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <AlertTriangle className="h-6 w-6" />
              </div>
            )}
            {semaforoRiesgo.estadoAlertaRiesgo === "excesivo" && (
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-400 border border-red-500/30">
                <ShieldAlert className="h-6 w-6" />
              </div>
            )}

            <div className="flex flex-col">
              <h2 className="text-base font-bold text-slate-50">Semáforo de Riesgo Comercial</h2>
              <p className="text-2xs text-slate-400">
                Evalúa tu nivel de crédito otorgado en función de tu volumen de ventas mensual.
              </p>
            </div>
          </div>

          {/* Toggle Automático / Manual & Ajustes */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-[#090B0B] p-1 border border-[#222A27]">
              <button
                type="button"
                onClick={() => manejarCambiarModo("automatico")}
                className={`px-3 py-1.5 text-2xs font-bold rounded-lg transition-all ${
                  modoState === "automatico"
                    ? "bg-emerald-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Ventas POS Reales
              </button>
              <button
                type="button"
                onClick={() => manejarCambiarModo("manual")}
                className={`px-3 py-1.5 text-2xs font-bold rounded-lg transition-all ${
                  modoState === "manual"
                    ? "bg-emerald-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Estimado Manual
              </button>
            </div>

            {esComerciante && (
              <button
                type="button"
                onClick={() => setModalAjustesAbierto(true)}
                className="flex items-center gap-1 rounded-xl border border-[#222A27] bg-[#090B0B] px-3 py-2 text-xs font-bold text-slate-200 hover:bg-[#222A27] transition-colors"
              >
                <Settings className="h-4 w-4 text-slate-400" />
                <span className="hidden sm:inline">Configurar</span>
              </button>
            )}
          </div>
        </div>

        {/* Métricas del Semáforo */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-1">
          <div className="flex flex-col gap-1 rounded-xl bg-[#090B0B] p-4 border border-[#222A27]">
            <span className="text-2xs font-semibold text-slate-400">Facturación Mensual Referencia</span>
            <p className="font-mono text-lg font-bold text-slate-50">
              {formatearPrecio(semaforoRiesgo.facturacionMensualReferencia)}
            </p>
            <span className="text-3xs text-slate-500">
              {modoState === "automatico" ? "Ventas reales POS 30 días" : "Monto manual estimado"}
            </span>
          </div>

          <div className="flex flex-col gap-1 rounded-xl bg-[#090B0B] p-4 border border-[#222A27]">
            <span className="text-2xs font-semibold text-slate-400">Tope Deuda Tolerable</span>
            <p className="font-mono text-lg font-bold text-slate-50">
              {semaforoRiesgo.topeDeudaTolerablePct}%
            </p>
            <span className="text-3xs text-slate-500">Porcentaje máximo sugerido</span>
          </div>

          <div className="flex flex-col gap-1 rounded-xl bg-[#090B0B] p-4 border border-[#222A27]">
            <span className="text-2xs font-semibold text-slate-400">Monto Máximo Fiado Sugerido</span>
            <p className="font-mono text-lg font-bold text-emerald-400">
              {formatearPrecio(semaforoRiesgo.montoMaximoRecomendado)}
            </p>
            <span className="text-3xs text-slate-500">Límite para no comprometer tu caja</span>
          </div>

          <div className="flex flex-col gap-1 rounded-xl bg-[#090B0B] p-4 border border-[#222A27]">
            <span className="text-2xs font-semibold text-slate-400">Deuda en Calle vs Facturación</span>
            <p className="font-mono text-lg font-bold text-amber-400">
              {semaforoRiesgo.deudaSobreFacturacionPct}%
            </p>
            <span className="text-3xs text-slate-500">Porcentaje de ventas fiadas afuera</span>
          </div>
        </div>

        {/* Banner de Estado de Alerta */}
        <div
          className={`flex items-center gap-3 rounded-xl p-4 border text-xs font-medium leading-relaxed ${
            semaforoRiesgo.estadoAlertaRiesgo === "saludable"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : semaforoRiesgo.estadoAlertaRiesgo === "precaucion"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          {semaforoRiesgo.estadoAlertaRiesgo === "saludable" && (
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                <strong>TODO EN ORDEN:</strong> Tu nivel de fiados representa el {semaforoRiesgo.deudaSobreFacturacionPct}% de tu facturación mensual, dentro del límite saludable del {semaforoRiesgo.topeDeudaTolerablePct}%. Podés otorgar crédito con tranquilidad.
              </span>
            </p>
          )}
          {semaforoRiesgo.estadoAlertaRiesgo === "precaucion" && (
            <p className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
              <span>
                <strong>PRECAUCIÓN DE CRÉDITO:</strong> Tu deuda en la calle representa el {semaforoRiesgo.deudaSobreFacturacionPct}% de tu facturación (cerca del límite sugerido de {formatearPrecio(semaforoRiesgo.montoMaximoRecomendado)}). Priorizá la cobranza antes de otorgar nuevos fiados.
              </span>
            </p>
          )}
          {semaforoRiesgo.estadoAlertaRiesgo === "excesivo" && (
            <p className="flex items-center gap-1.5">
              <AlertOctagon className="h-4 w-4 shrink-0 text-red-400" />
              <span>
                <strong>ALERTA DE RIESGO EXCESIVO:</strong> La deuda en la calle ({formatearPrecio(situacionCaja.deudaTotalCalle)}) superó el máximo recomendado ({formatearPrecio(semaforoRiesgo.montoMaximoRecomendado)}). Te sugerimos suspender nuevos créditos a fiado hasta recuperar liquidez.
              </span>
            </p>
          )}
        </div>
      </section>

      {/* 3. CONTROL DE CLIENTES & TOP 5 DEUDORES */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Métricas de Control de Clientes */}
        <section className="flex flex-col gap-4 rounded-2xl border border-[#222A27] bg-[#111615] p-6 shadow-xl">
          <div className="flex items-center gap-2 border-b border-[#222A27] pb-3">
            <Users className="h-5 w-5 text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Control de Clientes</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex flex-col gap-1 rounded-xl bg-[#090B0B] p-3.5 border border-[#222A27]">
              <span className="text-slate-400">Clientes en Padrón:</span>
              <span className="font-mono text-lg font-bold text-slate-100">
                {controlClientes.totalClientesPadron}
              </span>
            </div>

            <div className="flex flex-col gap-1 rounded-xl bg-[#090B0B] p-3.5 border border-[#222A27]">
              <span className="text-slate-400">Morosos Activos (con Deuda):</span>
              <span className="font-mono text-lg font-bold text-amber-400">
                {controlClientes.clientesConDeuda}
              </span>
            </div>

            <div className="flex flex-col gap-1 rounded-xl bg-[#090B0B] p-3.5 border border-[#222A27]">
              <span className="text-slate-400">Superan Límite de Crédito:</span>
              <span className="font-mono text-lg font-bold text-red-400">
                {controlClientes.clientesSuperanLimite}
              </span>
            </div>

            <div className="flex flex-col gap-1 rounded-xl bg-[#090B0B] p-3.5 border border-[#222A27]">
              <span className="text-slate-400">Deuda Promedio / Cliente:</span>
              <span className="font-mono text-lg font-bold text-slate-100">
                {formatearPrecio(controlClientes.deudaPromedio)}
              </span>
            </div>

            <div className="flex flex-col gap-1 rounded-xl bg-[#090B0B] p-3.5 border border-[#222A27]">
              <span className="text-slate-400">Deuda Más Alta (1 Cliente):</span>
              <span className="font-mono text-lg font-bold text-amber-400">
                {formatearPrecio(controlClientes.deudaMasAlta)}
              </span>
            </div>

            <div className="flex flex-col gap-1 rounded-xl bg-[#090B0B] p-3.5 border border-[#222A27]">
              <span className="text-slate-400">Deuda +30 Días sin Pago:</span>
              <span className="font-mono text-lg font-bold text-red-400">
                {formatearPrecio(controlClientes.deudaMas30Dias)}
              </span>
            </div>
          </div>
        </section>

        {/* Top 5 Deudores — A quién llamar primero */}
        <section className="flex flex-col gap-4 rounded-2xl border border-[#222A27] bg-[#111615] p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#222A27] pb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Top 5 Deudores</h3>
            </div>
            <span className="text-2xs text-slate-400">A quién llamar primero</span>
          </div>

          {top5Deudores.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center text-xs text-slate-400">
              <Check className="h-8 w-8 text-emerald-500 mb-2" />
              <p className="font-bold text-slate-200">¡Excelente noticias!</p>
              <p>No tenés clientes con saldo deudor pendiente en este momento.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {top5Deudores.map((d, index) => (
                <div
                  key={d.clienteFinalId}
                  onClick={() => abrirModalClientePorId(d.clienteFinalId)}
                  className="flex items-center justify-between rounded-xl bg-[#090B0B] p-3.5 border border-[#222A27] text-xs cursor-pointer hover:bg-[#1A211F] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#111615] border border-[#222A27] text-2xs font-bold text-slate-300">
                      #{index + 1}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-50 flex items-center gap-1">
                        <span>{d.nombre}</span>
                        <ExternalLink className="h-3 w-3 text-slate-500" />
                      </span>
                      <span className="text-3xs text-slate-400">
                        {d.diasSinPagar > 0 ? `${d.diasSinPagar} días sin abono` : "Compra reciente"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-amber-400">
                      {formatearPrecio(d.saldoDeudor)}
                    </span>

                    {d.telefono && (
                      <button
                        type="button"
                        onClick={(e) => abrirWhatsAppDeudor(e, d.nombre, d.telefono, d.saldoDeudor)}
                        className="flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1.5 text-2xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        title="Reclamar cobro por WhatsApp"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* MODAL CONFIGURACIÓN DE RIESGO */}
      {modalAjustesAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090B0B]/80 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-[#222A27] bg-[#111615] p-6 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#222A27] pb-3">
              <h3 className="text-sm font-bold">Ajustes de Semáforo de Riesgo Comercial</h3>
              <button
                type="button"
                onClick={() => setModalAjustesAbierto(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-[#222A27]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={manejarGuardarConfiguracion} className="flex flex-col gap-4 text-xs">
              {errorLocal && <MensajeError codigo={errorLocal} className="w-full" />}

              {/* Modo de Facturación */}
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-300">Modo de Facturación Referencia:</label>
                <select
                  value={modoState}
                  onChange={(e) => setModoState(e.target.value as "automatico" | "manual")}
                  className="rounded-xl border border-[#222A27] bg-[#090B0B] p-3 text-slate-100 focus:border-emerald-500 focus:outline-none font-semibold"
                >
                  <option value="automatico">Automático (Suma de Ventas POS 30 días)</option>
                  <option value="manual">Manual (Monto estimado ingresado por vos)</option>
                </select>
              </div>

              {/* Monto Manual */}
              {modoState === "manual" && (
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-300">Facturación Mensual Estimada ($):</label>
                  <InputDinero
                    value={manualMonto}
                    onValueChange={(val) => setManualMonto(String(val))}
                    placeholder="0,00"
                    className="p-3 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-3xs text-slate-400">
                    Ingresá cuánto factura tu comercio en un mes normal para tener de referencia.
                  </span>
                </div>
              )}

              {/* Tope Tolerable % */}
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-300">Tope de Deuda Tolerable (%):</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="100"
                  value={topePct}
                  onChange={(e) => setTopePct(e.target.value)}
                  className="rounded-xl border border-[#222A27] bg-[#090B0B] p-3 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-3xs text-slate-400">
                  Porcentaje máximo de tu facturación que aceptás tener fiado (ej. 30%).
                </span>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#222A27] pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setModalAjustesAbierto(false)}
                  disabled={isPending}
                  className="rounded-xl border border-[#222A27] bg-[#090B0B] px-4 py-2.5 font-bold text-slate-300 hover:bg-[#222A27]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center justify-center min-w-[110px] rounded-xl bg-emerald-500 px-4 py-2.5 font-bold text-slate-950 hover:bg-emerald-400"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Ajustes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ficha Rápida desde Top Deudores */}
      {clienteSeleccionadoModal && (
        <ModalFichaClienteRapida
          cliente={clienteSeleccionadoModal}
          movimientosCliente={movimientosDelClienteSeleccionado}
          nombreComercio={nombreComercio}
          onClose={() => setClienteSeleccionadoModal(null)}
        />
      )}
    </div>
  );
}
