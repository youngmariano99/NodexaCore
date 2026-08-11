import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RegistradorVistaVidriera } from "@/components/analytics/registrador-vista-vidriera";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { obtenerClientePublicoPorSlug } from "@/repositories/clientes";
import { obtenerProductosPublicadosPaginados, PRODUCTOS_PUBLICOS_POR_PAGINA } from "@/repositories/productosRepository";

const FORMATO_PRECIO = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
const COLOR_POR_DEFECTO = "#3B82F6";

/**
 * ISR (docs/BACKLOG.md Paso 1 y 3): la página se regenera en segundo plano
 * como máximo cada 60s — un cambio de publicación/precio se refleja sin
 * rebuild manual (Criterio de Aceptación 2), y entre regeneraciones se sirve
 * desde caché de Edge (`vercel.json`, headers `Cache-Control` con
 * `s-maxage=60, stale-while-revalidate=300` para `/c/:clienteSlug`) sin
 * pegarle a PostgreSQL en cada visita (Criterio de Aceptación 4).
 */
export const revalidate = 60;

interface PageProps {
  params: Promise<{ clienteSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { clienteSlug } = await params;
  const supabase = await crearClienteSupabaseServidor();
  const resultado = await obtenerClientePublicoPorSlug(supabase, clienteSlug);

  if (!resultado.ok) {
    return { title: "Vidriera no disponible — Nodexa Core" };
  }

  return { title: `${resultado.data.nombre_comercio} — Catálogo` };
}

/**
 * Vidriera pública del comercio (docs/SITEMAP.md "/c/[clienteSlug] →
 * Vidriera pública (Catálogo Web)"; docs/ERRORS.md `NX-WEB-004`). Consulta
 * `clientes` vía la política RLS `clientes_lectura_publica` (Paso 2 lo pide
 * para `productos`; acá aplica el mismo criterio para resolver el slug) y,
 * si el comercio no existe o está suspendido, dispara `notFound()` — mismo
 * mensaje genérico para ambos casos, sin filtrar cuál de los dos ocurrió
 * (Criterio de Aceptación 3).
 */
export default async function VidrieraPublica({ params, searchParams }: PageProps) {
  const { clienteSlug } = await params;
  const { page } = await searchParams;
  const paginaActual = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);

  const supabase = await crearClienteSupabaseServidor();

  const resultadoCliente = await obtenerClientePublicoPorSlug(supabase, clienteSlug);

  if (!resultadoCliente.ok) {
    notFound();
  }

  const cliente = resultadoCliente.data;
  const colorPrimario = cliente.color_primario ?? COLOR_POR_DEFECTO;

  const resultadoProductos = await obtenerProductosPublicadosPaginados(supabase, cliente.cliente_id, paginaActual);

  const productos = resultadoProductos.ok ? resultadoProductos.data.productos : [];
  const total = resultadoProductos.ok ? resultadoProductos.data.total : 0;
  const totalPaginas = Math.max(1, Math.ceil(total / PRODUCTOS_PUBLICOS_POR_PAGINA));

  return (
    <div className="flex flex-1 flex-col bg-white text-slate-900">
      <RegistradorVistaVidriera clienteId={cliente.cliente_id} />

      <header className="flex flex-col items-center gap-3 px-6 py-10 text-center" style={{ backgroundColor: `${colorPrimario}1A` }}>
        {cliente.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo de un CDN externo (Cloudinary), sin dominios de next/image configurados.
          <img
            src={cliente.logo_url}
            alt={cliente.nombre_comercio}
            className="h-16 w-16 rounded-full border border-slate-200 bg-white object-contain"
          />
        ) : null}
        <h1 className="text-2xl font-semibold text-slate-900">{cliente.nombre_comercio}</h1>
        <p className="text-sm text-slate-600">{total} producto{total === 1 ? "" : "s"} disponible{total === 1 ? "" : "s"}</p>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
        {productos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-slate-300 px-6 py-16 text-center">
            <p className="text-base text-slate-900">Este comercio todavía no tiene productos publicados.</p>
            <p className="text-sm text-slate-500">Volvé a visitarnos pronto.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {productos.map((producto) => (
              <li key={producto.producto_id}>
                <Link
                  href={`/c/${clienteSlug}/producto/${producto.producto_id}`}
                  className="flex h-full flex-col overflow-hidden rounded-md border border-slate-200 transition-shadow duration-150 hover:shadow-md"
                >
                  <div className="aspect-square w-full bg-slate-100">
                    {producto.imagen_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- imagen de un CDN externo (Cloudinary).
                      <img
                        src={producto.imagen_url}
                        alt={producto.nombre}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <span className="line-clamp-2 text-sm font-medium text-slate-900">{producto.nombre}</span>
                    {producto.categoria ? <span className="text-xs text-slate-500">{producto.categoria}</span> : null}
                    <span className="mt-auto font-mono text-sm font-semibold" style={{ color: colorPrimario }}>
                      {FORMATO_PRECIO.format(producto.precio)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {totalPaginas > 1 ? (
          <nav className="flex items-center justify-between text-sm text-slate-600" aria-label="Paginación del catálogo">
            <Link
              href={`/c/${clienteSlug}?page=${Math.max(1, paginaActual - 1)}`}
              aria-disabled={paginaActual <= 1}
              className={`flex min-h-11 items-center rounded-md border border-slate-300 px-4 transition-colors duration-150 ${
                paginaActual <= 1 ? "pointer-events-none opacity-40" : "hover:border-slate-400"
              }`}
            >
              ← Anterior
            </Link>
            <span className="font-mono">
              Página {paginaActual} de {totalPaginas}
            </span>
            <Link
              href={`/c/${clienteSlug}?page=${Math.min(totalPaginas, paginaActual + 1)}`}
              aria-disabled={paginaActual >= totalPaginas}
              className={`flex min-h-11 items-center rounded-md border border-slate-300 px-4 transition-colors duration-150 ${
                paginaActual >= totalPaginas ? "pointer-events-none opacity-40" : "hover:border-slate-400"
              }`}
            >
              Siguiente →
            </Link>
          </nav>
        ) : null}
      </main>
    </div>
  );
}
