"use client";

import { useState } from "react";

import { MensajeError } from "@/components/errores/MensajeError";
import { ModalCuotaAgotadaIa } from "@/components/productos/ModalCuotaAgotadaIa";

interface RespuestaCargaIaExitosa {
  cargaIaId: string;
  nombre: string | null;
  precio: number | null;
  categoria: string | null;
  imagenUrl: string;
}

interface RespuestaCargaIaError {
  codigo: string;
}

interface FormularioCargaIaProps {
  cuotaAgotadaInicial: boolean;
}

/**
 * Formulario de subida de foto de etiqueta (docs/BACKLOG.md "Bloqueo y
 * oferta de recarga al agotar la cuota de IA", Pasos 3-4). `cuotaAgotada`
 * arranca con el valor ya calculado en el servidor (`page.tsx`, misma
 * función pura `cuotaIaAgotada` que usa el Route Handler) y puede pasar a
 * `true` en caliente si el POST devuelve `NX-IA-002` — cubre el caso límite
 * de que la cuota se agote entre que se renderizó la página y que el usuario
 * confirma la carga.
 */
export function FormularioCargaIa({ cuotaAgotadaInicial }: FormularioCargaIaProps) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cuotaAgotada, setCuotaAgotada] = useState(cuotaAgotadaInicial);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [resultado, setResultado] = useState<RespuestaCargaIaExitosa | null>(null);

  async function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!archivo || cuotaAgotada) {
      return;
    }

    setEnviando(true);
    setError(null);
    setResultado(null);

    const formData = new FormData();
    formData.set("imagen", archivo);

    try {
      const respuesta = await fetch("/api/carga-ia", { method: "POST", body: formData });
      const cuerpo = (await respuesta.json()) as RespuestaCargaIaExitosa | RespuestaCargaIaError;

      if (!respuesta.ok) {
        const codigo = (cuerpo as RespuestaCargaIaError).codigo;
        if (codigo === "NX-IA-002") {
          setCuotaAgotada(true);
          setModalAbierto(true);
        } else {
          setError(codigo);
        }
        return;
      }

      setResultado(cuerpo as RespuestaCargaIaExitosa);
      setArchivo(null);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border border-slate-700 bg-slate-800 p-6">
      <form onSubmit={manejarEnvio} className="flex flex-col gap-4">
        <label htmlFor="imagen-etiqueta" className="text-sm text-slate-400">
          Foto de la etiqueta del producto
        </label>
        <input
          id="imagen-etiqueta"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={cuotaAgotada || enviando}
          onChange={(evento) => setArchivo(evento.target.files?.[0] ?? null)}
          className="min-h-11 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <MensajeError codigo={error} />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!archivo || enviando || cuotaAgotada}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-blue-500 px-4 text-sm font-medium text-slate-50 transition-colors duration-150 hover:bg-blue-500/90 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:hover:bg-slate-700"
          >
            {enviando ? "Cargando..." : "Cargar foto con IA"}
          </button>

          {cuotaAgotada ? (
            <button
              type="button"
              onClick={() => setModalAbierto(true)}
              className="min-h-11 rounded-md border border-slate-700 px-4 text-sm text-slate-50 transition-colors duration-150 hover:border-blue-500"
            >
              Ver paquete de recarga
            </button>
          ) : null}
        </div>

        {cuotaAgotada ? (
          <p role="status" className="text-sm text-slate-400">
            Ya usaste todas tus cargas por IA de este mes. Podés seguir cargando productos de forma manual mientras
            tanto.
          </p>
        ) : null}
      </form>

      {resultado ? (
        <div role="status" className="flex flex-col gap-1 rounded-md border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50">
          <span className="text-slate-400">Datos sugeridos por la foto:</span>
          <span>{resultado.nombre ?? "Sin nombre detectado"}</span>
          <span>{resultado.categoria ?? "Sin categoría detectada"}</span>
          <span className="font-mono">{resultado.precio !== null ? `$${resultado.precio}` : "Sin precio detectado"}</span>
        </div>
      ) : null}

      <ModalCuotaAgotadaIa abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} />
    </div>
  );
}
