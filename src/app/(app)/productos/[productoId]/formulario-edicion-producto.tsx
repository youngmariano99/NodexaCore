"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

import { MensajeError } from "@/components/errores/MensajeError";
import { actualizarProducto } from "@/services/productos/actualizarProducto";
import { ESTADO_ACTUALIZAR_PRODUCTO_INICIAL } from "@/services/productos/tipos";

const CLASES_CAMPO_BASE =
  "min-h-11 rounded-md border bg-[#0D1110] px-4 text-base text-[#F3F5F4] placeholder:text-[#737C78] outline-none transition-colors duration-150 focus:border-[#16D39A]";

import { useToast } from "@/components/ui/Toast";
import { InputDinero } from "@/components/ui/InputDinero";

interface FormularioEdicionProductoProps {
  producto: {
    producto_id: string;
    sku: string;
    nombre: string;
    descripcion: string | null;
    categoria: string | null;
    precio: number;
  };
}

export function FormularioEdicionProducto({ producto }: FormularioEdicionProductoProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const actualizarProductoConId = actualizarProducto.bind(null, producto.producto_id);
  const [estado, accionFormulario, estaEnviando] = useActionState(
    actualizarProductoConId,
    ESTADO_ACTUALIZAR_PRODUCTO_INICIAL
  );

  useEffect(() => {
    if (estado.exito) {
      toast.exito("Producto actualizado exitosamente.");
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      router.push("/productos");
    }
  }, [estado.exito, router, queryClient, toast]);

  const codigoErrorFormulario = estado.error ? estado.error : null;

  return (
    <form action={accionFormulario} className="flex w-full max-w-md flex-col gap-5" noValidate>
      {/* Botón Volver */}
      <div className="flex">
        <Link
          href="/productos"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#A6AEAA] hover:text-[#F3F5F4] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al catálogo
        </Link>
      </div>

      {/* SKU (Solo Lectura) */}
      <div className="flex flex-col gap-2">
        <label htmlFor="sku" className="text-sm font-medium text-[#F3F5F4]">
          SKU (No editable)
        </label>
        <input
          id="sku"
          name="sku"
          type="text"
          value={producto.sku}
          readOnly
          tabIndex={-1}
          className={`${CLASES_CAMPO_BASE} cursor-not-allowed opacity-50 border-[#222A27] select-none`}
        />
      </div>

      {/* Nombre */}
      <div className="flex flex-col gap-2">
        <label htmlFor="nombre" className="text-sm font-medium text-[#F3F5F4]">
          Nombre
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          placeholder="ej. Yerba Mate Clásica 1kg"
          defaultValue={producto.nombre}
          required
          className={`${CLASES_CAMPO_BASE} border-[#222A27]`}
        />
      </div>

      {/* Categoría */}
      <div className="flex flex-col gap-2">
        <label htmlFor="categoria" className="text-sm font-medium text-[#F3F5F4]">
          Categoría
        </label>
        <input
          id="categoria"
          name="categoria"
          type="text"
          placeholder="ej. Almacén"
          defaultValue={producto.categoria ?? ""}
          required
          className={`${CLASES_CAMPO_BASE} border-[#222A27]`}
        />
      </div>

      {/* Descripción */}
      <div className="flex flex-col gap-2">
        <label htmlFor="descripcion" className="text-sm font-medium text-[#F3F5F4]">
          Descripción
        </label>
        <textarea
          id="descripcion"
          name="descripcion"
          placeholder="ej. Yerba con palo con estacionamiento natural."
          defaultValue={producto.descripcion ?? ""}
          className={`${CLASES_CAMPO_BASE} border-[#222A27] h-24 py-3 resize-none`}
        />
      </div>

      {/* Precio */}
      <div className="flex flex-col gap-2">
        <label htmlFor="precio" className="text-sm font-medium text-[#F3F5F4]">
          Precio
        </label>
        <InputDinero
          id="precio"
          name="precio"
          defaultValue={producto.precio}
          required
        />
      </div>

      <MensajeError codigo={codigoErrorFormulario} />

      <button
        type="submit"
        disabled={estaEnviando}
        className="min-h-11 rounded-md bg-[#16D39A] px-4 text-base font-semibold text-[#090B0B] transition-colors duration-150 hover:bg-[#16D39A]/90 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-[#16D39A] outline-none"
      >
        {estaEnviando ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Guardando cambios...
          </>
        ) : (
          "Guardar cambios"
        )}
      </button>
    </form>
  );
}
