"use client";

import { CheckCircle2, Lock, MapPin, Navigation, Phone, ShieldCheck, Truck } from "lucide-react";
import { useState } from "react";

import { MensajeError } from "@/components/errores/MensajeError";
import type { PedidoDeliveryEntity, RepartidorEntity } from "@/repositories/deliverysRepository";

interface VistaMovilDeliveryProps {
  repartidor: RepartidorEntity;
  pedidosIniciales?: PedidoDeliveryEntity[];
  onMarcarEntregado?: (pedidoId: string) => Promise<void>;
}

export function VistaMovilDelivery({
  repartidor,
  pedidosIniciales = [],
  onMarcarEntregado,
}: VistaMovilDeliveryProps) {
  const [pinIngresado, setPinIngresado] = useState("");
  const [autenticado, setAutenticado] = useState(false);
  const [codigoError, setCodigoError] = useState<string | null>(null);
  const [pedidos, setPedidos] = useState<PedidoDeliveryEntity[]>(pedidosIniciales);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const formatearPrecio = (monto: number) => {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(monto);
  };

  const manejarValidarPin = (e: React.FormEvent) => {
    e.preventDefault();
    setCodigoError(null);

    if (pinIngresado.trim() === repartidor.pin_acceso) {
      setAutenticado(true);
    } else {
      setCodigoError("NX-DELIV-002");
    }
  };

  const abrirNavegadorMapa = (direccion?: string) => {
    if (!direccion) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
    window.open(url, "_blank");
  };

  const manejarEntregado = async (pedidoId: string) => {
    setProcesandoId(pedidoId);
    setPedidos((prev) => prev.filter((p) => p.pedido_id !== pedidoId));

    if (onMarcarEntregado) {
      try {
        await onMarcarEntregado(pedidoId);
      } catch {
        // Ignorar en UI local
      }
    }
    setProcesandoId(null);
  };

  // Pantalla 1: Verificación de PIN de Acceso
  if (!autenticado) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-950 p-6 text-slate-100">
        <form
          onSubmit={manejarValidarPin}
          className="flex w-full max-w-sm flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 text-center shadow-2xl backdrop-blur-md"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#16D39A]/10 text-[#16D39A]">
            <Lock className="h-7 w-7" />
          </div>

          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold text-slate-50">Hoja de Reparto</h1>
            <p className="text-xs text-slate-400">
              Ingresá tu PIN de 4 dígitos para ver tus pedidos asignados, {repartidor.nombre}.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <input
              type="password"
              maxLength={4}
              required
              value={pinIngresado}
              onChange={(e) => setPinIngresado(e.target.value)}
              placeholder="••••"
              className="min-h-14 tracking-widest text-center text-2xl font-bold rounded-xl border border-slate-700 bg-slate-950 px-4 text-slate-100 focus:border-[#16D39A] focus:outline-none"
            />
          </div>

          <MensajeError codigo={codigoError} />

          <button
            type="submit"
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#16D39A] font-bold text-slate-950 transition-colors hover:bg-[#16D39A]/90"
          >
            <ShieldCheck className="h-5 w-5" />
            <span>Ingresar a la Hoja</span>
          </button>
        </form>
      </div>
    );
  }

  // Pantalla 2: Listado Móvil de Pedidos Asignados
  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-950 p-4 text-slate-100 max-w-md mx-auto">
      <header className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#16D39A]/10 text-[#16D39A]">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-50">{repartidor.nombre}</h1>
            <span className="text-xs text-slate-400">
              {pedidos.length} {pedidos.length === 1 ? "pedido pendiente" : "pedidos pendientes"}
            </span>
          </div>
        </div>
      </header>

      {pedidos.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-800 p-8 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          <h2 className="text-sm font-bold text-slate-200">¡Todo entregado!</h2>
          <p className="text-xs text-slate-400">No tenés nuevos repartos asignados en este momento.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {pedidos.map((pedido) => (
            <article
              key={pedido.pedido_id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-mono text-xs font-bold text-[#16D39A]">
                  #{pedido.pedido_id.substring(0, 8)}
                </span>
                <span className="text-xs font-bold text-slate-50">
                  {formatearPrecio(pedido.total)} ({pedido.metodo_pago})
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-base font-bold text-slate-50">
                  {pedido.datos_cliente.nombre}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-300">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <a href={`tel:${pedido.datos_cliente.telefono}`} className="underline">
                    {pedido.datos_cliente.telefono}
                  </a>
                </span>
                {pedido.datos_cliente.direccion && (
                  <span className="flex items-start gap-1.5 text-xs text-slate-300">
                    <MapPin className="h-3.5 w-3.5 text-[#16D39A] shrink-0 mt-0.5" />
                    <span>{pedido.datos_cliente.direccion}</span>
                  </span>
                )}
              </div>

              {pedido.datos_cliente.notas && (
                <div className="rounded-lg bg-slate-950 p-2 text.xs text-amber-300">
                  📝 {pedido.datos_cliente.notas}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => abrirNavegadorMapa(pedido.datos_cliente.direccion)}
                  className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 text-xs font-bold text-slate-100 transition-colors hover:bg-slate-700"
                >
                  <Navigation className="h-4 w-4 text-[#16D39A]" />
                  <span>Cómo llegar</span>
                </button>

                <button
                  type="button"
                  disabled={procesandoId === pedido.pedido_id}
                  onClick={() => manejarEntregado(pedido.pedido_id)}
                  className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#16D39A] text-xs font-bold text-slate-950 transition-colors hover:bg-[#16D39A]/90 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Entregado</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
