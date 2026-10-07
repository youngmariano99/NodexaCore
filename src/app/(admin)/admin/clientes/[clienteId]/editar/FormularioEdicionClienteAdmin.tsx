"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { MensajeError } from "@/components/errores/MensajeError";
import { actualizarCliente, type EstadoActualizarCliente } from "@/services/admin/actualizarCliente";

const CLASES_CAMPO_BASE =
  "min-h-11 rounded-md border bg-[#0D1110] px-4 text-base text-[#F3F5F4] placeholder:text-[#737C78] outline-none transition-colors duration-150 focus:border-[#16D39A]";

interface FormularioEdicionClienteAdminProps {
  clienteId: string;
  clienteActual: {
    nombre_comercio: string;
    slug: string;
    telefono_whatsapp: string;
    limite_sku: number;
    packs_sku_contratados: number;
    cuota_mensual_ia: number;
    dominio_personalizado: string | null;
    estado_pago: boolean;
    configuracion_plantilla?: { modalidad_catalogo?: string } | null;
  };
}

export function FormularioEdicionClienteAdmin({ clienteId, clienteActual }: FormularioEdicionClienteAdminProps) {
  const router = useRouter();
  const [estado, formAction, isPending] = useActionState(
    (estadoPrevio: EstadoActualizarCliente, formData: FormData) => actualizarCliente(clienteId, estadoPrevio, formData),
    {}
  );

  useEffect(() => {
    if (estado?.ok) {
      router.push(`/admin/clientes/${clienteId}`);
      router.refresh();
    }
  }, [estado, router, clienteId]);

  return (
    <form action={formAction} className="flex w-full flex-col gap-6" noValidate>
      {estado?.error && <MensajeError codigo={estado.error} />}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="nombre_comercio" className="text-sm font-medium text-[#F3F5F4]">
            Nombre del Comercio
          </label>
          <input
            id="nombre_comercio"
            name="nombre_comercio"
            type="text"
            defaultValue={clienteActual.nombre_comercio}
            required
            className={`${CLASES_CAMPO_BASE} border-[#222A27]`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="slug" className="text-sm font-medium text-[#F3F5F4]">
            Slug (identificador único)
          </label>
          <input
            id="slug"
            name="slug"
            type="text"
            defaultValue={clienteActual.slug}
            required
            pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
            className={`${CLASES_CAMPO_BASE} border-[#222A27]`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="telefono_whatsapp" className="text-sm font-medium text-[#F3F5F4]">
            Teléfono de WhatsApp
          </label>
          <input
            id="telefono_whatsapp"
            name="telefono_whatsapp"
            type="tel"
            defaultValue={clienteActual.telefono_whatsapp}
            required
            className={`${CLASES_CAMPO_BASE} border-[#222A27]`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="dominio_personalizado" className="text-sm font-medium text-[#F3F5F4]">
            Dominio Personalizado (opcional)
          </label>
          <input
            id="dominio_personalizado"
            name="dominio_personalizado"
            type="text"
            defaultValue={clienteActual.dominio_personalizado || ""}
            placeholder="ej. mi-tienda.com"
            className={`${CLASES_CAMPO_BASE} border-[#222A27]`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="limite_sku" className="text-sm font-medium text-[#F3F5F4]">
            Límite de SKU Base
          </label>
          <input
            id="limite_sku"
            name="limite_sku"
            type="number"
            min="1"
            defaultValue={clienteActual.limite_sku}
            required
            className={`${CLASES_CAMPO_BASE} border-[#222A27]`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="packs_sku_contratados" className="text-sm font-medium text-[#F3F5F4]">
            Packs de Ampliación de SKU
          </label>
          <input
            id="packs_sku_contratados"
            name="packs_sku_contratados"
            type="number"
            min="0"
            defaultValue={clienteActual.packs_sku_contratados}
            required
            className={`${CLASES_CAMPO_BASE} border-[#222A27]`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="cuota_mensual_ia" className="text-sm font-medium text-[#F3F5F4]">
            Cuota Mensual IA
          </label>
          <input
            id="cuota_mensual_ia"
            name="cuota_mensual_ia"
            type="number"
            min="0"
            defaultValue={clienteActual.cuota_mensual_ia}
            required
            className={`${CLASES_CAMPO_BASE} border-[#222A27]`}
          />
        </div>
        
        <div className="flex flex-col gap-2">
          <label htmlFor="modalidad_catalogo" className="text-sm font-medium text-[#F3F5F4]">
            Modalidad de Catálogo
          </label>
          <select
            id="modalidad_catalogo"
            name="modalidad_catalogo"
            defaultValue={clienteActual.configuracion_plantilla?.modalidad_catalogo || "vidriera"}
            className={`${CLASES_CAMPO_BASE} border-[#222A27]`}
          >
            <option value="vidriera">Solo Vidriera</option>
            <option value="pedidos_whatsapp">Pedidos por WhatsApp</option>
            <option value="comandas_realtime">Comandas Realtime</option>
          </select>
        </div>
        
        <div className="flex items-center gap-3 pt-8">
          <input
            id="estado_pago"
            name="estado_pago"
            type="checkbox"
            defaultChecked={clienteActual.estado_pago}
            className="h-5 w-5 rounded border-[#222A27] bg-[#0D1110] text-[#16D39A] focus:ring-[#16D39A] focus:ring-offset-[#111615]"
          />
          <label htmlFor="estado_pago" className="text-sm font-medium text-[#F3F5F4]">
            Estado de Pago al Día
          </label>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isPending}
          className="min-h-11 rounded-md border border-[#222A27] bg-transparent px-4 text-sm font-medium text-slate-50 hover:bg-[#222A27] disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#16D39A] px-4 text-sm font-bold text-[#090B0B] transition-colors hover:bg-[#16D39A]/90 disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar Cambios
        </button>
      </div>
    </form>
  );
}
