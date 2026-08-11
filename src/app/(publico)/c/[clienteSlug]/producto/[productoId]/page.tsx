import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BotonWhatsappCta } from "@/components/analytics/boton-whatsapp-cta";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { obtenerClientePublicoPorSlug } from "@/repositories/clientes";
import { obtenerProductoPublicoPorId } from "@/repositories/productosRepository";

const FORMATO_PRECIO = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

export const revalidate = 60;

interface PageProps {
  params: Promise<{ clienteSlug: string; productoId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { clienteSlug, productoId } = await params;
  const supabase = await crearClienteSupabaseServidor();

  const resultadoCliente = await obtenerClientePublicoPorSlug(supabase, clienteSlug);
  if (!resultadoCliente.ok) {
    return { title: "Producto no disponible — Nodexa Core" };
  }

  const resultadoProducto = await obtenerProductoPublicoPorId(supabase, resultadoCliente.data.cliente_id, productoId);
  if (!resultadoProducto.ok) {
    return { title: "Producto no disponible — Nodexa Core" };
  }

  return { title: `${resultadoProducto.data.nombre} — ${resultadoCliente.data.nombre_comercio}` };
}

export default async function FichaProductoPublica({ params }: PageProps) {
  const { clienteSlug, productoId } = await params;
  const supabase = await crearClienteSupabaseServidor();

  const resultadoCliente = await obtenerClientePublicoPorSlug(supabase, clienteSlug);
  if (!resultadoCliente.ok) {
    notFound();
  }

  const cliente = resultadoCliente.data;

  const resultadoProducto = await obtenerProductoPublicoPorId(supabase, cliente.cliente_id, productoId);
  if (!resultadoProducto.ok) {
    notFound();
  }

  const producto = resultadoProducto.data;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6">
      <Link href={`/c/${clienteSlug}`} className="text-sm text-slate-500 hover:text-slate-800">
        ← Volver a {cliente.nombre_comercio}
      </Link>

      <div className="grid gap-8 sm:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-2xl bg-slate-100">
          {producto.imagen_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={producto.imagen_url} alt={producto.nombre} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">Sin imagen</div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {producto.categoria ? (
            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {producto.categoria}
            </span>
          ) : null}

          <h1 className="text-2xl font-semibold text-slate-900">{producto.nombre}</h1>

          <p className="text-3xl font-bold text-slate-900">{FORMATO_PRECIO.format(producto.precio)}</p>

          {producto.descripcion ? (
            <p className="whitespace-pre-line text-slate-600">{producto.descripcion}</p>
          ) : null}

          <div className="mt-2">
            {cliente.telefono_whatsapp ? (
              <BotonWhatsappCta
                clienteId={cliente.cliente_id}
                productoId={producto.producto_id}
                productoNombre={producto.nombre}
                precio={producto.precio}
                numeroWhatsapp={cliente.telefono_whatsapp}
              />
            ) : (
              <p className="text-sm text-slate-500">Este comercio no tiene WhatsApp disponible por el momento.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
