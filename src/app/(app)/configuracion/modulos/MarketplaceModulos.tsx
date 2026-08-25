"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { MensajeError } from "@/components/errores/MensajeError";
import { type ModuloNodexa, NOMBRE_MODULO_NODEXA } from "@/services/admin/tipos";
import { solicitarModulo } from "@/services/configuracion/solicitarModulo";

interface MarketplaceModulosProps {
  modulosContratados: Record<ModuloNodexa, boolean>;
}

export function MarketplaceModulos({ modulosContratados }: MarketplaceModulosProps) {
  const [solicitudesExitosas, setSolicitudesExitosas] = useState<Record<ModuloNodexa, boolean>>(
    {} as Record<ModuloNodexa, boolean>
  );
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSolicitar = (modulo: ModuloNodexa) => {
    setErrorLocal(null);
    startTransition(async () => {
      const res = await solicitarModulo(modulo);
      if (res.ok) {
        setSolicitudesExitosas((prev) => ({ ...prev, [modulo]: true }));
      } else {
        setErrorLocal(res.error || "NX-SYS-001");
      }
    });
  };

  const DESCRIPCION_MODULOS: Record<ModuloNodexa, string> = {
    catalogo_web: "Publicá tu catálogo en línea con vidriera interactiva y autogestionada para tus clientes.",
    carga_ia: "Cargá productos de forma ultra rápida escaneando etiquetas con inteligencia artificial.",
    fiados: "Controlá las cuentas corrientes de tus clientes fiados, saldos deudores y pagos recibidos.",
    devoluciones: "Gestioná devoluciones de ventas y emití notas de crédito correspondientes de forma organizada.",
    bot_whatsapp: "Automatizá consultas de stock y pedidos de tus clientes a través de un Bot de WhatsApp integrado.",
  };

  const modulosOrdenados = Object.keys(NOMBRE_MODULO_NODEXA) as ModuloNodexa[];

  return (
    <div className="flex flex-col gap-6">
      {errorLocal && (
        <MensajeError codigo={errorLocal} className="w-full" />
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {modulosOrdenados.map((modulo) => {
          const contratado = modulosContratados[modulo];
          const solicitado = solicitudesExitosas[modulo];

          return (
            <article
              key={modulo}
              className={`flex flex-col justify-between rounded-lg border p-5 transition-all duration-200 bg-[#0D1110] ${
                contratado
                  ? "border-emerald-500/30 shadow-emerald-950/20 shadow-md"
                  : "border-[#222A27]"
              }`}
            >
              <div className="flex flex-col gap-3">
                <header className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-slate-100 text-base">
                    {NOMBRE_MODULO_NODEXA[modulo]}
                  </h3>
                  {contratado ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Activo
                    </span>
                  ) : solicitado ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
                      Solicitado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#111615] px-2 py-0.5 text-xs font-medium text-slate-400">
                      Disponible
                    </span>
                  )}
                </header>

                <p className="text-sm text-slate-400 leading-relaxed min-h-[60px]">
                  {DESCRIPCION_MODULOS[modulo]}
                </p>
              </div>

              <div className="mt-6 flex flex-col pt-4 border-t border-[#222A27]/60">
                {contratado ? (
                  <p className="text-xs text-slate-500 text-center">
                    Módulo contratado y listo para usar en tu comercio.
                  </p>
                ) : solicitado ? (
                  <p className="text-xs text-blue-400 text-center font-medium">
                    ✓ Solicitud registrada. Un asesor activará tu acceso a la brevedad.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSolicitar(modulo)}
                    disabled={isPending}
                    className="flex min-h-10 items-center justify-center rounded-md bg-blue-500 px-4 text-xs font-semibold text-slate-50 hover:bg-blue-400 transition-colors duration-150 disabled:opacity-50"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Solicitar Activación"
                    )}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
