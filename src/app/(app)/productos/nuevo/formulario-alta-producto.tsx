"use client";

import { useActionState, useState } from "react";

import { MensajeError } from "@/components/errores/MensajeError";
import { ModalBloqueoSku } from "@/components/productos/ModalBloqueoSku";
import { crearProducto } from "@/services/productos/crearProducto";
import { ESTADO_CREAR_PRODUCTO_INICIAL } from "@/services/productos/tipos";

const CLASES_CAMPO_BASE =
  "min-h-11 rounded-md border bg-slate-700 px-4 text-base text-slate-50 placeholder:text-slate-400 outline-none transition-colors duration-150 focus:border-blue-500";

/**
 * Alta manual de producto (docs/SITEMAP.md "/productos/nuevo"). El bloqueo
 * por límite de plan (`NX-PRD-001`) no se muestra como el resto de errores
 * de formulario (nunca con `MensajeError`/borde rojo): abre
 * `ModalBloqueoSku` en su lugar, siguiendo docs/DESIGN.md §4 ("modal de
 * bloqueo empático... nunca en tono punitivo o rojo").
 */
export function FormularioAltaProducto() {
  const [estado, accionFormulario, estaEnviando] = useActionState(crearProducto, ESTADO_CREAR_PRODUCTO_INICIAL);
  const [ultimoEstadoVisto, setUltimoEstadoVisto] = useState(estado);
  const [modalCerradoManualmente, setModalCerradoManualmente] = useState(false);

  // Ajuste de estado durante el render (patrón recomendado por React en vez
  // de un efecto: https://react.dev/learn/you-might-not-need-an-effect):
  // cada envío nuevo produce un objeto `estado` distinto: si choca de nuevo
  // con el límite, el modal tiene que reaparecer, no quedar oculto por el
  // cierre manual del intento anterior.
  if (estado !== ultimoEstadoVisto) {
    setUltimoEstadoVisto(estado);
    setModalCerradoManualmente(false);
  }

  const bloqueadoPorLimite = estado.error === "NX-PRD-001" && !modalCerradoManualmente;
  const codigoErrorFormulario = estado.error && estado.error !== "NX-PRD-001" ? estado.error : null;

  return (
    <>
      <form action={accionFormulario} className="flex w-full max-w-md flex-col gap-5" noValidate>
        <div className="flex flex-col gap-2">
          <label htmlFor="sku" className="text-sm font-medium text-slate-50">
            SKU
          </label>
          <input
            id="sku"
            name="sku"
            type="text"
            placeholder="ej. YER-1KG-001"
            required
            className={`${CLASES_CAMPO_BASE} border-[#222A27]`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="nombre" className="text-sm font-medium text-slate-50">
            Nombre
          </label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            placeholder="ej. Yerba mate 1kg"
            required
            className={`${CLASES_CAMPO_BASE} border-[#222A27]`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="categoria" className="text-sm font-medium text-slate-50">
            Categoría
          </label>
          <input
            id="categoria"
            name="categoria"
            type="text"
            placeholder="ej. Almacén"
            required
            className={`${CLASES_CAMPO_BASE} border-[#222A27]`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="precio" className="text-sm font-medium text-slate-50">
            Precio
          </label>
          <input
            id="precio"
            name="precio"
            type="number"
            min="0"
            step="0.01"
            placeholder="ej. 3500"
            required
            className={`${CLASES_CAMPO_BASE} border-[#222A27]`}
          />
        </div>

        <MensajeError codigo={codigoErrorFormulario} />

        {estado.exito ? (
          <p role="status" className="text-sm text-emerald-500">
            Producto cargado con éxito.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={estaEnviando}
          className="min-h-11 rounded-md bg-[#16D39A] px-4 text-base font-semibold text-[#090B0B] transition-colors duration-150 hover:bg-[#16D39A]/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {estaEnviando ? "Guardando..." : "Guardar producto"}
        </button>
      </form>

      <ModalBloqueoSku abierto={bloqueadoPorLimite} onCerrar={() => setModalCerradoManualmente(true)} />
    </>
  );
}
