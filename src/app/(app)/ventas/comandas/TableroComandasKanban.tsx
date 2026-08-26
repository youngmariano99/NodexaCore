"use client";

import { MessageCircle, Clock, CheckCircle, Truck, ChefHat, XCircle, ArrowRight } from "lucide-react";
import { useCallback, useState } from "react";

import { MensajeError } from "@/components/errores/MensajeError";

export type EstadoPedidoKanban = "pendiente" | "en_preparacion" | "despachado" | "completado" | "cancelado";

export interface ItemPedidoKanban {
  itemId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}

export interface PedidoKanban {
  pedidoId: string;
  clienteId: string;
  datosCliente: {
    nombre: string;
    telefono: string;
    direccion?: string;
    notas?: string;
  };
  metodoPago: string;
  opcionEntrega: "envio" | "retiro";
  estado: EstadoPedidoKanban;
  subtotal: number;
  costoEnvio: number;
  montoAjuste: number;
  total: number;
  creadoEn: string;
  items: ItemPedidoKanban[];
}

interface ColumnasConfig {
  id: EstadoPedidoKanban;
  titulo: string;
  icono: React.ElementType;
  badgeBg: string;
  badgeColor: string;
}

const COLUMNAS: ColumnasConfig[] = [
  {
    id: "pendiente",
    titulo: "Pendientes",
    icono: Clock,
    badgeBg: "bg-amber-500/10",
    badgeColor: "text-amber-400 border-amber-500/30",
  },
  {
    id: "en_preparacion",
    titulo: "En Preparación",
    icono: ChefHat,
    badgeBg: "bg-blue-500/10",
    badgeColor: "text-blue-400 border-blue-500/30",
  },
  {
    id: "despachado",
    titulo: "En Camino",
    icono: Truck,
    badgeBg: "bg-[#16D39A]/10",
    badgeColor: "text-[#16D39A] border-[#16D39A]/30",
  },
  {
    id: "completado",
    titulo: "Completados",
    icono: CheckCircle,
    badgeBg: "bg-emerald-500/10",
    badgeColor: "text-emerald-400 border-emerald-500/30",
  },
  {
    id: "cancelado",
    titulo: "Cancelados",
    icono: XCircle,
    badgeBg: "bg-red-500/10",
    badgeColor: "text-red-400 border-red-500/30",
  },
];

interface TableroComandasKanbanProps {
  pedidosIniciales?: PedidoKanban[];
  nombreComercio?: string;
  onCambiarEstadoPedido?: (pedidoId: string, nuevoEstado: EstadoPedidoKanban) => Promise<void>;
}

export function TableroComandasKanban({
  pedidosIniciales = [],
  nombreComercio = "Comercio",
  onCambiarEstadoPedido,
}: TableroComandasKanbanProps) {
  const [pedidos, setPedidos] = useState<PedidoKanban[]>(pedidosIniciales);
  const [pedidoArrastradoId, setPedidoArrastradoId] = useState<string | null>(null);
  const [codigoError, setCodigoError] = useState<string | null>(null);

  const formatearPrecio = (monto: number) => {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(monto);
  };

  /**
   * Cambia el estado de un pedido y ejecuta la actualización reactiva en BD
   */
  const cambiarEstado = useCallback(
    async (pedidoId: string, nuevoEstado: EstadoPedidoKanban) => {
      setCodigoError(null);
      setPedidos((prev) =>
        prev.map((p) => (p.pedidoId === pedidoId ? { ...p, estado: nuevoEstado } : p))
      );

      if (onCambiarEstadoPedido) {
        try {
          await onCambiarEstadoPedido(pedidoId, nuevoEstado);
        } catch {
          setCodigoError("NX-SYS-001");
        }
      }
    },
    [onCambiarEstadoPedido]
  );

  /**
   * Genera y abre el enlace de WhatsApp con el mensaje preconfigurado según el estado del pedido
   * Criterio de Aceptación: Abre una ventana flotante de WhatsApp con el mensaje formateado hacia el teléfono del cliente.
   */
  const abrirWhatsAppNotificacion = (pedido: PedidoKanban, estadoObjetivo?: EstadoPedidoKanban) => {
    const estadoMensaje = estadoObjetivo ?? pedido.estado;
    const telefonoLimpio = pedido.datosCliente.telefono.replace(/\D/g, "");

    let mensajeText = "";
    switch (estadoMensaje) {
      case "en_preparacion":
        mensajeText = `¡Hola ${pedido.datosCliente.nombre}! 👋 Tu pedido en ${nombreComercio} ya está en preparación 👨‍🍳. ¡Te avisaremos cuando esté listo!`;
        break;
      case "despachado":
        mensajeText = `¡Hola ${pedido.datosCliente.nombre}! 🚚 Tu pedido en ${nombreComercio} va en camino a tu domicilio (${pedido.datosCliente.direccion ?? "Retiro"}).`;
        break;
      case "completado":
        mensajeText = `¡Hola ${pedido.datosCliente.nombre}! ⭐ Tu pedido en ${nombreComercio} ha sido entregado con éxito. ¡Muchas gracias por tu compra!`;
        break;
      case "cancelado":
        mensajeText = `Hola ${pedido.datosCliente.nombre}. Te informamos que tu pedido en ${nombreComercio} ha sido cancelado. Ante cualquier duda consultanos por este medio.`;
        break;
      default:
        mensajeText = `¡Hola ${pedido.datosCliente.nombre}! Te escribimos desde ${nombreComercio} por tu pedido de ${formatearPrecio(pedido.total)}.`;
        break;
    }

    const url = `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensajeText)}`;
    window.open(url, "_blank");
  };

  // Handlers para Drag & Drop nativo HTML5
  const manejarDragStart = (pedidoId: string) => {
    setPedidoArrastradoId(pedidoId);
  };

  const manejarDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const manejarDrop = (columnaEstado: EstadoPedidoKanban) => {
    if (!pedidoArrastradoId) return;
    cambiarEstado(pedidoArrastradoId, columnaEstado);
    setPedidoArrastradoId(null);
  };

  return (
    <div className="flex flex-1 flex-col gap-6 bg-slate-950 p-6 text-slate-100 min-h-[calc(100vh-4rem)]">
      <header className="flex flex-col gap-1 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Tablero Kanban de Comandas & Pedidos</h1>
          <p className="text-xs text-slate-400">
            Gestión en tiempo real de pedidos web con notificación rápida por WhatsApp.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Suscrito a Realtime
          </span>
        </div>
      </header>

      <MensajeError codigo={codigoError} />

      {/* Tablero Kanban organizado por columnas de estado */}
      <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5 overflow-x-auto pb-4">
        {COLUMNAS.map((columna) => {
          const IconoColumna = columna.icono;
          const pedidosColumna = pedidos.filter((p) => p.estado === columna.id);

          return (
            <div
              key={columna.id}
              onDragOver={manejarDragOver}
              onDrop={() => manejarDrop(columna.id)}
              className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 min-w-[280px]"
            >
              {/* Header de la Columna */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <IconoColumna className="h-4 w-4 text-[#16D39A]" />
                  <h2 className="text-sm font-bold text-slate-100">{columna.titulo}</h2>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-bold ${columna.badgeBg} ${columna.badgeColor}`}
                >
                  {pedidosColumna.length}
                </span>
              </div>

              {/* Contenedor de Tarjetas de Pedidos */}
              <div className="flex flex-1 flex-col gap-3 min-h-[400px]">
                {pedidosColumna.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
                    Sin pedidos en este estado
                  </div>
                ) : (
                  pedidosColumna.map((pedido) => (
                    <article
                      key={pedido.pedidoId}
                      draggable
                      onDragStart={() => manejarDragStart(pedido.pedidoId)}
                      className="flex cursor-grab flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-100 shadow-md transition-all hover:border-[#16D39A]/50 active:cursor-grabbing"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[#16D39A]">
                          #{pedido.pedidoId.substring(0, 8)}
                        </span>
                        <span className="text-2xs text-slate-400">
                          {pedido.opcionEntrega === "envio" ? "🚚 Envío" : "🏪 Retiro"}
                        </span>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-slate-50">
                          {pedido.datosCliente.nombre}
                        </span>
                        <span className="text-xs text-slate-400">
                          📞 {pedido.datosCliente.telefono}
                        </span>
                        {pedido.datosCliente.direccion && (
                          <span className="text-xs text-slate-400 truncate">
                            📍 {pedido.datosCliente.direccion}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-1 border-t border-b border-slate-900 py-2">
                        {pedido.items.map((item) => (
                          <div key={item.itemId} className="flex justify-between text-xs text-slate-300">
                            <span>
                              {item.nombre} x{item.cantidad}
                            </span>
                            <span className="font-medium text-slate-400">
                              {formatearPrecio(item.precioUnitario * item.cantidad)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 uppercase text-2xs font-semibold">
                          {pedido.metodoPago}
                        </span>
                        <span className="text-sm font-bold text-slate-50">
                          {formatearPrecio(pedido.total)}
                        </span>
                      </div>

                      {/* Acciones Rápidas: Botones de Transición y WhatsApp */}
                      <div className="flex items-center justify-between pt-1 gap-2">
                        <button
                          type="button"
                          onClick={() => abrirWhatsAppNotificacion(pedido)}
                          className="flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                          title="Enviar aviso por WhatsApp"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span>WhatsApp</span>
                        </button>

                        {columna.id === "pendiente" && (
                          <button
                            type="button"
                            onClick={() => {
                              cambiarEstado(pedido.pedidoId, "en_preparacion");
                              abrirWhatsAppNotificacion(pedido, "en_preparacion");
                            }}
                            className="flex min-h-9 items-center gap-1 rounded-lg bg-[#16D39A] px-3 text-xs font-bold text-slate-950 hover:bg-[#16D39A]/90 transition-colors"
                          >
                            <span>Preparar</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}

                        {columna.id === "en_preparacion" && (
                          <button
                            type="button"
                            onClick={() => {
                              cambiarEstado(pedido.pedidoId, "despachado");
                              abrirWhatsAppNotificacion(pedido, "despachado");
                            }}
                            className="flex min-h-9 items-center gap-1 rounded-lg bg-[#16D39A] px-3 text-xs font-bold text-slate-950 hover:bg-[#16D39A]/90 transition-colors"
                          >
                            <span>Despachar</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
