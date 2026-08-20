"use client";

import { useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { MensajeError } from "@/components/errores/MensajeError";
import { useProductosPaginados } from "@/hooks/useProductosPaginados";
import { alternarPublicacionProducto } from "@/services/catalogoWeb/alternarPublicacionProducto";
import { ESTADO_ALTERNAR_PUBLICACION_PRODUCTO_INICIAL } from "@/services/catalogoWeb/tipos";

const FORMATO_PRECIO = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

export default function ConfiguracionVidrieraPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paginaActual = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const queryClient = useQueryClient();

  const { data, isPending, isError } = useProductosPaginados(paginaActual);
  const [isPendingToggle, startTransitionToggle] = useTransition();
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [productoIdEnProgreso, setProductoIdEnProgreso] = useState<string | null>(null);

  if (isPending) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#090B0B] px-6 py-10 text-[#A6AEAA]">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Cargando catálogo...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#090B0B] px-6">
        <MensajeError codigo="NX-SYS-001" className="max-w-md" />
      </div>
    );
  }

  const { productos, total, porPagina } = data;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  const cambiarPagina = (nuevaPagina: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nuevaPagina));
    router.push(`/catalogo-web?${params.toString()}`);
  };

  const handleToggle = (producto: typeof productos[0]) => {
    setErrorAccion(null);

    const proximoEstado = !producto.publicado;

    // Paso 4: Validar antes de cambiar el estado de publicado que el producto tenga nombre, precio e imagen
    if (proximoEstado) {
      const tieneNombre = producto.nombre.trim().length > 0;
      const tienePrecio = producto.precio > 0;
      const tieneImagen = Boolean(producto.imagen_url?.trim());

      if (!tieneNombre || !tienePrecio || !tieneImagen) {
        setErrorAccion("NX-WEB-002");
        return;
      }
    }

    setProductoIdEnProgreso(producto.producto_id);

    startTransitionToggle(async () => {
      const formData = new FormData();
      formData.append("publicado", proximoEstado ? "true" : "false");

      const resultado = await alternarPublicacionProducto(
        producto.producto_id,
        ESTADO_ALTERNAR_PUBLICACION_PRODUCTO_INICIAL,
        formData
      );

      if (resultado.exito) {
        await queryClient.invalidateQueries({ queryKey: ["productos"] });
      } else {
        setErrorAccion(resultado.error);
      }
      setProductoIdEnProgreso(null);
    });
  };

  return (
    <div className="flex flex-1 flex-col bg-[#090B0B] px-6 py-10 text-[#F3F5F4]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-[#F3F5F4]">Publicación de Vidriera</h1>
          <p className="text-sm text-[#A6AEAA]">
            Habilitá o deshabilitá qué productos se muestran en tu catálogo online público.
          </p>
        </header>

        {errorAccion && (
          <MensajeError codigo={errorAccion} className="w-full" />
        )}

        {productos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-[#222A27] bg-[#111615] px-6 py-12 text-center">
            <p className="text-base text-[#F3F5F4]">No tenés productos en tu catálogo.</p>
            <p className="text-sm text-[#A6AEAA]">
              Cargá productos en el listado para poder publicarlos en tu vidriera.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-[#222A27] bg-[#111615]">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#222A27] text-[#A6AEAA]">
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium">Precio</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium text-center">Publicado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222A27]">
                {productos.map((producto) => {
                  const enProgreso = productoIdEnProgreso === producto.producto_id && isPendingToggle;
                  return (
                    <tr key={producto.producto_id} className="hover:bg-[#151C1A]/50 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[#A6AEAA]">
                        {producto.sku}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#F3F5F4]">
                        {producto.nombre}
                      </td>
                      <td className="px-4 py-3 text-[#A6AEAA]">
                        {producto.categoria || "-"}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#F3F5F4]">
                        {FORMATO_PRECIO.format(producto.precio)}
                      </td>
                      <td className="px-4 py-3 text-[#A6AEAA]">
                        {producto.stock_actual}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center">
                          {enProgreso ? (
                            <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                          ) : (
                            <button
                              type="button"
                              role="switch"
                              aria-checked={producto.publicado}
                              disabled={isPendingToggle}
                              onClick={() => handleToggle(producto)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[#111615] ${
                                producto.publicado ? "bg-emerald-500" : "bg-[#222A27]"
                              }`}
                            >
                              <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  producto.publicado ? "translate-x-5" : "translate-x-0"
                                }`}
                              />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPaginas > 1 && (
          <div className="flex items-center justify-between border-t border-[#222A27] pt-4">
            <span className="text-xs text-[#A6AEAA]">
              Página {paginaActual} de {totalPaginas}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => cambiarPagina(paginaActual - 1)}
                disabled={paginaActual === 1}
                className="rounded-md border border-[#222A27] bg-[#111615] px-3 py-1 text-xs font-medium text-[#F3F5F4] hover:bg-[#1C2421] disabled:opacity-50 disabled:hover:bg-[#111615]"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => cambiarPagina(paginaActual + 1)}
                disabled={paginaActual === totalPaginas}
                className="rounded-md border border-[#222A27] bg-[#111615] px-3 py-1 text-xs font-medium text-[#F3F5F4] hover:bg-[#1C2421] disabled:opacity-50 disabled:hover:bg-[#111615]"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
