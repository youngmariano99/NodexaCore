"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { MensajeError } from "@/components/errores/MensajeError";
import { type ModuloNodexa, NOMBRE_MODULO_NODEXA } from "@/services/admin/tipos";
import { actualizarModuloCliente } from "@/services/admin/actualizarModuloCliente";

interface PanelModulosAdminProps {
  clienteId: string;
  modulosContratados: Record<ModuloNodexa, boolean>;
}

export function PanelModulosAdmin({ clienteId, modulosContratados }: PanelModulosAdminProps) {
  const router = useRouter();
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (modulo: ModuloNodexa, activoActual: boolean) => {
    setErrorLocal(null);
    startTransition(async () => {
      const res = await actualizarModuloCliente(clienteId, modulo, !activoActual);
      if (res.ok) {
        router.refresh();
      } else {
        setErrorLocal(res.error || "NX-SYS-001");
      }
    });
  };

  const modulosOrdenados = Object.keys(NOMBRE_MODULO_NODEXA) as ModuloNodexa[];

  return (
    <div className="flex flex-col gap-6">
      {errorLocal && (
        <MensajeError codigo={errorLocal} className="w-full" />
      )}

      <div className="overflow-hidden rounded-md border border-[#222A27] bg-[#111615]">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#222A27] text-slate-400 bg-[#151c1a]">
              <th className="px-6 py-4 font-medium">Módulo</th>
              <th className="px-6 py-4 font-medium">Estado actual</th>
              <th className="px-6 py-4 font-medium text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222A27]">
            {modulosOrdenados.map((modulo) => {
              const activo = modulosContratados[modulo];
              return (
                <tr key={modulo} className="hover:bg-[#151c1a] transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-200">
                      {NOMBRE_MODULO_NODEXA[modulo]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {activo ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-[#16D39A]">
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-[#1c2421] border border-[#222A27] px-2.5 py-0.5 text-xs font-medium text-slate-400">
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleToggle(modulo, activo)}
                      className={`inline-flex min-h-11 items-center justify-center rounded-md px-4 text-xs font-semibold transition-colors duration-150 ${
                        activo
                          ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                          : "bg-[#16D39A] text-slate-950 hover:bg-[#14be8b] font-semibold"
                      }`}
                    >
                      {isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : activo ? (
                        "Desactivar"
                      ) : (
                        "Activar"
                      )}
                    </button>
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

