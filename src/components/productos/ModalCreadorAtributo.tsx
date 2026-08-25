"use client";

import { useState } from "react";
import { z } from "zod";
import { X, Tag, FolderPlus, AlertCircle } from "lucide-react";

import { crearMarca } from "@/services/productos/crearMarca";
import { crearCategoria } from "@/services/productos/crearCategoria";
import { obtenerMensajeError } from "@/lib/errores/catalogo";

const esquemaCreadorAtributo = z.object({
  nombre: z
    .string({ message: "El nombre es obligatorio." })
    .trim()
    .min(1, "El nombre es obligatorio."),
});

interface ModalCreadorAtributoProps {
  abierto: boolean;
  onCerrar: () => void;
  tipo: "marca" | "categoria";
  onExito: (nombre: string) => void;
}

export function ModalCreadorAtributo({
  abierto,
  onCerrar,
  tipo,
  onExito,
}: ModalCreadorAtributoProps) {
  const [nombre, setNombre] = useState("");
  const [errorNombre, setErrorNombre] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  if (!abierto) {
    return null;
  }

  const alEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNombre(null);
    setErrorAccion(null);

    const resultado = esquemaCreadorAtributo.safeParse({ nombre });

    if (!resultado.success) {
      const issue = resultado.error.issues[0];
      setErrorNombre(issue.message);
      return;
    }

    setCargando(true);

    const formData = new FormData();
    formData.append("nombre", resultado.data.nombre);

    try {
      if (tipo === "marca") {
        const respuesta = await crearMarca({ error: null, exito: false }, formData);
        if (respuesta.exito) {
          onExito(resultado.data.nombre);
          setNombre("");
          onCerrar();
        } else {
          setErrorAccion(respuesta.error);
        }
      } else {
        const respuesta = await crearCategoria({ error: null, exito: false }, formData);
        if (respuesta.exito) {
          onExito(resultado.data.nombre);
          setNombre("");
          onCerrar();
        } else {
          setErrorAccion(respuesta.error);
        }
      }
    } catch {
      setErrorAccion("NX-SYS-001");
    } finally {
      setCargando(false);
    }
  };

  const alCerrarModal = () => {
    setNombre("");
    setErrorNombre(null);
    setErrorAccion(null);
    onCerrar();
  };

  const titulo = tipo === "marca" ? "Nueva Marca" : "Nueva Categoría";
  const Icono = tipo === "marca" ? Tag : FolderPlus;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 transition-opacity duration-200"
    >
      <div className="relative flex w-full max-w-md scale-95 flex-col gap-4 rounded-md border border-slate-700 bg-slate-800 p-6 shadow-xl transition-transform duration-200">
        <button
          type="button"
          onClick={alCerrarModal}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-50"
          aria-label="Cerrar modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 text-emerald-500">
          <Icono className="h-6 w-6 shrink-0" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-50">{titulo}</h2>
        </div>

        <form onSubmit={alEnviar} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nombre-atributo" className="text-sm font-medium text-slate-300">
              Nombre
            </label>
            <input
              id="nombre-atributo"
              type="text"
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={`min-h-11 rounded-md border bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                errorNombre ? "border-red-500 focus:ring-red-500" : "border-slate-700 focus:border-emerald-500"
              }`}
              placeholder={tipo === "marca" ? "Ej: Nike, Adidas" : "Ej: Remeras, Calzado"}
            />
            {errorNombre && (
              <span className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {errorNombre}
              </span>
            )}
          </div>

          {errorAccion && (
            <div className="flex items-start gap-2.5 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{obtenerMensajeError(errorAccion)}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={alCerrarModal}
              className="min-h-11 rounded-md border border-slate-700 px-4 text-sm font-medium text-slate-50 hover:bg-slate-700 transition-colors duration-150"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="min-h-11 rounded-md bg-[#16D39A] px-5 text-sm font-semibold text-[#090B0B] hover:bg-[#16D39A]/90 disabled:opacity-50 transition-colors duration-150"
            >
              {cargando ? "Guardando..." : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
