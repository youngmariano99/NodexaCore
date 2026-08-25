"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, Plus, PhoneCall, Calendar, Truck } from "lucide-react";
import { z } from "zod";

import { MensajeError } from "@/components/errores/MensajeError";
import { crearProveedor } from "@/services/stock/crearProveedor";
import { ESTADO_CREAR_PROVEEDOR_INICIAL } from "@/services/stock/tipos";
import type { FilaProveedor } from "@/repositories/proveedoresRepository";

const esquemaZodProveedor = z.object({
  nombre: z.string().min(1, "El nombre del proveedor es obligatorio."),
  contacto: z.string().min(1, "El contacto es obligatorio."),
  diasDemora: z.number().int().min(0, "Los días de demora deben ser un número entero no negativo."),
});

interface FormularioProveedoresProps {
  proveedores: FilaProveedor[];
}

export function FormularioProveedores({ proveedores }: FormularioProveedoresProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [contacto, setContacto] = useState("");
  const [diasDemora, setDiasDemora] = useState<number>(0);
  
  const [erroresFormulario, setErroresFormulario] = useState<Record<string, string>>({});
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpen = () => {
    setNombre("");
    setContacto("");
    setDiasDemora(0);
    setErroresFormulario({});
    setErrorServidor(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (!isPending) {
      setIsOpen(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErroresFormulario({});
    setErrorServidor(null);

    const validacion = esquemaZodProveedor.safeParse({
      nombre,
      contacto,
      diasDemora,
    });

    if (!validacion.success) {
      const mapeoErrores: Record<string, string> = {};
      validacion.error.issues.forEach((err) => {
        if (err.path[0]) {
          mapeoErrores[err.path[0].toString()] = err.message;
        }
      });
      setErroresFormulario(mapeoErrores);
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("nombre", nombre);
      formData.append("contacto", contacto);
      formData.append("diasDemora", diasDemora.toString());

      const resultado = await crearProveedor(ESTADO_CREAR_PROVEEDOR_INICIAL, formData);

      if (resultado.exito) {
        setIsOpen(false);
        router.refresh();
      } else {
        setErrorServidor(resultado.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">Proveedores</h1>
          <p className="text-sm text-slate-400">
            {proveedores.length} proveedor{proveedores.length === 1 ? "" : "es"} registrado{proveedores.length === 1 ? "" : "s"} en el catálogo.
          </p>
        </div>
        <button
          onClick={handleOpen}
          className="flex min-h-11 items-center gap-2 rounded-md bg-emerald-500 px-4 text-sm font-semibold text-slate-950 transition-colors duration-150 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          <Plus className="h-4 w-4" />
          Nuevo Proveedor
        </button>
      </div>

      {proveedores.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-[#222A27] bg-[#111615] px-6 py-12 text-center">
          <Truck className="h-8 w-8 text-slate-400" aria-hidden="true" />
          <p className="text-base text-slate-50">No hay proveedores registrados.</p>
          <p className="text-sm text-slate-400">
            Cargá tus proveedores habituales para asociarlos a tus productos y controlar los tiempos de reabastecimiento.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[#222A27] bg-[#111615]">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#222A27] text-slate-400">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Contacto / Teléfono</th>
                <th className="px-4 py-3 font-medium">Demora Estimada de Entrega</th>
              </tr>
            </thead>
            <tbody>
              {proveedores.map((prov) => (
                <tr
                  key={prov.proveedor_id}
                  className="border-b border-[#222A27] last:border-b-0 hover:bg-[#151c1b] transition-colors"
                >
                  <td className="px-4 py-3 text-slate-200 font-medium">
                    {prov.nombre}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    <span className="flex items-center gap-2">
                      <PhoneCall className="h-3.5 w-3.5 text-slate-500" />
                      {prov.contacto}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      {prov.dias_demora} {prov.dias_demora === 1 ? "día" : "días"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border border-[#222A27] bg-[#0D1110] p-6 text-slate-50 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#222A27] pb-4">
              <h2 className="text-lg font-semibold text-slate-50">Dar de Alta Proveedor</h2>
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="rounded-md p-1 text-slate-400 hover:bg-[#111615] hover:text-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
              {errorServidor && (
                <MensajeError codigo={errorServidor} className="w-full" />
              )}

              {/* Nombre */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Nombre del Proveedor
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Distribuidora Norte"
                  disabled={isPending}
                  required
                  className="w-full rounded-md border border-[#222A27] bg-[#111615] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
                {erroresFormulario.nombre && (
                  <span className="text-xs text-red-400">{erroresFormulario.nombre}</span>
                )}
              </div>

              {/* Contacto */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Contacto / Teléfono
                </label>
                <input
                  type="text"
                  value={contacto}
                  onChange={(e) => setContacto(e.target.value)}
                  placeholder="Ej: +5491122334455 o correo@correo.com"
                  disabled={isPending}
                  required
                  className="w-full rounded-md border border-[#222A27] bg-[#111615] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
                {erroresFormulario.contacto && (
                  <span className="text-xs text-red-400">{erroresFormulario.contacto}</span>
                )}
              </div>

              {/* Días de Demora */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Días de demora estimado
                </label>
                <input
                  type="number"
                  value={diasDemora}
                  onChange={(e) => setDiasDemora(Number(e.target.value))}
                  placeholder="Ej: 3"
                  min="0"
                  disabled={isPending}
                  required
                  className="w-full rounded-md border border-[#222A27] bg-[#111615] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
                {erroresFormulario.diasDemora && (
                  <span className="text-xs text-red-400">{erroresFormulario.diasDemora}</span>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-2 border-t border-[#222A27] pt-4 mt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="rounded-md border border-[#222A27] bg-transparent px-4 py-2 text-sm font-medium text-slate-300 hover:bg-[#111615] hover:text-slate-100 disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition-colors flex items-center justify-center min-w-[100px]"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Guardar"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
