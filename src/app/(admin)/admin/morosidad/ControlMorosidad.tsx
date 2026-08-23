"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert, CheckCircle2, MessageSquare } from "lucide-react";

import { MensajeError } from "@/components/errores/MensajeError";
import { actualizarEstadoPago } from "@/services/admin/actualizarEstadoPago";

interface ClienteItem {
  cliente_id: string;
  nombre_comercio: string;
  slug: string;
  telefono_whatsapp: string;
  estado_pago: boolean;
}

interface ControlMorosidadProps {
  clientesIniciales: ClienteItem[];
}

export function ControlMorosidad({ clientesIniciales }: ControlMorosidadProps) {
  const router = useRouter();
  const [clientes, setClientes] = useState(clientesIniciales);
  const [notificaciones, setNotificaciones] = useState<Record<string, string>>({});
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleToggleEstadoPago = (clienteId: string, estadoPagoActual: boolean) => {
    setErrorLocal(null);
    startTransition(async () => {
      const res = await actualizarEstadoPago(clienteId, !estadoPagoActual);
      if (res.ok) {
        // Actualizar estado local
        setClientes((prev) =>
          prev.map((c) =>
            c.cliente_id === clienteId ? { ...c, estado_pago: res.data.estadoPago } : c
          )
        );

        // Si se suspendió, guardar el enlace de WhatsApp retornado
        if (!res.data.estadoPago && res.data.notificacion?.enlaceWhatsapp) {
          setNotificaciones((prev) => ({
            ...prev,
            [clienteId]: res.data.notificacion.enlaceWhatsapp,
          }));
        } else {
          // Si se reactivó, quitar el enlace de notificación anterior
          setNotificaciones((prev) => {
            const copia = { ...prev };
            delete copia[clienteId];
            return copia;
          });
        }
        router.refresh();
      } else {
        setErrorLocal(res.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {errorLocal && (
        <MensajeError codigo={errorLocal} className="w-full" />
      )}

      <div className="overflow-hidden rounded-md border border-slate-800 bg-slate-900/30">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
              <th className="px-6 py-4 font-medium">Comercio</th>
              <th className="px-6 py-4 font-medium">WhatsApp</th>
              <th className="px-6 py-4 font-medium">Estado Pago</th>
              <th className="px-6 py-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {clientes.map((c) => {
              const whatsappLink = notificaciones[c.cliente_id];

              return (
                <tr key={c.cliente_id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-200">{c.nombre_comercio}</span>
                      <span className="text-xs text-slate-500 font-mono">{c.slug}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300 font-mono">
                    {c.telefono_whatsapp}
                  </td>
                  <td className="px-6 py-4">
                    {c.estado_pago ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Regularizado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400">
                        <ShieldAlert className="h-3 w-3" />
                        Suspendido
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {whatsappLink && (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-emerald-500 px-3 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition-colors duration-150"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Notificar
                        </a>
                      )}

                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleToggleEstadoPago(c.cliente_id, c.estado_pago)}
                        className={`inline-flex min-h-9 items-center justify-center rounded-md px-4 text-xs font-semibold transition-colors duration-150 ${
                          c.estado_pago
                            ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                            : "bg-blue-500 text-slate-50 hover:bg-blue-400 font-semibold"
                        }`}
                      >
                        {isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : c.estado_pago ? (
                          "Suspender"
                        ) : (
                          "Reactivar"
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
