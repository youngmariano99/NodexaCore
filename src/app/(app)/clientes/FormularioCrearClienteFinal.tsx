"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, UserPlus } from "lucide-react";

import { MensajeError } from "@/components/errores/MensajeError";
import { crearClienteFinal } from "@/services/fiados/crearClienteFinal";
import { ESTADO_CREAR_CLIENTE_FINAL_INICIAL } from "@/services/fiados/tipos";

export function FormularioCrearClienteFinal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpen = () => {
    setNombre("");
    setTelefono("");
    setErrorLocal(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (!isPending) {
      setIsOpen(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    if (!nombre.trim()) {
      setErrorLocal("NX-SYS-006"); // Name is mandatory
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("nombre", nombre);
      formData.append("telefono", telefono);

      const resultado = await crearClienteFinal(
        ESTADO_CREAR_CLIENTE_FINAL_INICIAL,
        formData
      );

      if (resultado.exito) {
        setIsOpen(false);
        router.refresh();
      } else {
        setErrorLocal(resultado.error);
      }
    });
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex min-h-11 items-center gap-2 rounded-md bg-emerald-500 px-4 text-sm font-semibold text-slate-950 transition-colors duration-150 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950"
      >
        <UserPlus className="h-4 w-4" />
        Nuevo Cliente
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border border-[#222A27] bg-[#0D1110] p-6 text-slate-50 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#222A27] pb-4">
              <h2 className="text-lg font-semibold text-slate-50">Dar de Alta Cliente</h2>
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
              {errorLocal && (
                <MensajeError codigo={errorLocal} className="w-full" />
              )}

              {/* Nombre */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  disabled={isPending}
                  required
                  className="w-full rounded-md border border-[#222A27] bg-[#111615] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Teléfono */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Teléfono (opcional)
                </label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: +5491122334455"
                  disabled={isPending}
                  className="w-full rounded-md border border-[#222A27] bg-[#111615] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
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
    </>
  );
}
