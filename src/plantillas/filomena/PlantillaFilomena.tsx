import Link from "next/link";
import type { PlantillaProps } from "../tipos";

const FORMATO_PRECIO = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

export default function PlantillaFilomena({
  cliente,
  productos,
  totalPaginas = 1,
  paginaActual = 1,
  clienteSlug = "",
}: PlantillaProps) {
  return (
    <div className="flex flex-1 flex-col bg-rose-50/30 text-slate-800 font-sans">
      <header className="flex flex-col items-center gap-3 bg-gradient-to-b from-rose-100/60 to-transparent px-6 py-10 text-center">
        {cliente.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cliente.logo_url}
            alt={cliente.nombre_comercio}
            className="h-18 w-18 rounded-2xl border-2 border-rose-200 bg-white object-contain shadow-sm p-1"
          />
        ) : null}
        <h1 className="text-3xl font-bold tracking-tight text-rose-950">{cliente.nombre_comercio}</h1>
        <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">
          Plantilla Filomena
        </span>
        <p className="text-xs font-medium text-rose-700/80">
          ¡Descubrí todos nuestros productos disponibles! ({productos.length})
        </p>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
        {productos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-rose-200 bg-white p-12 text-center shadow-sm">
            <p className="text-base font-semibold text-rose-900">Catálogo en preparación</p>
            <p className="text-sm text-slate-500">Pronto vas a poder ver las novedades de Filomena.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {productos.map((producto) => (
              <li key={producto.producto_id}>
                <Link
                  href={clienteSlug ? `/c/${clienteSlug}/producto/${producto.producto_id}` : "#"}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="aspect-square w-full bg-rose-50/50 overflow-hidden">
                    {producto.imagen_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={producto.imagen_url}
                        alt={producto.nombre}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    {producto.categoria ? (
                      <span className="text-2xs font-semibold uppercase tracking-wider text-rose-500">{producto.categoria}</span>
                    ) : null}
                    <h2 className="mt-1 text-sm font-semibold text-slate-800 line-clamp-2">{producto.nombre}</h2>
                    <span className="mt-auto pt-2 font-mono text-base font-bold text-rose-600">
                      {FORMATO_PRECIO.format(producto.precio)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {totalPaginas > 1 ? (
          <nav className="flex items-center justify-between text-xs font-medium text-rose-800" aria-label="Paginación del catálogo">
            <Link
              href={`/c/${clienteSlug}?page=${Math.max(1, paginaActual - 1)}`}
              aria-disabled={paginaActual <= 1}
              className={`flex min-h-11 items-center rounded-xl border border-rose-200 bg-white px-4 transition-colors ${
                paginaActual <= 1 ? "pointer-events-none opacity-40" : "hover:bg-rose-50"
              }`}
            >
              ← Anterior
            </Link>
            <span className="font-mono font-semibold">
              {paginaActual} de {totalPaginas}
            </span>
            <Link
              href={`/c/${clienteSlug}?page=${Math.min(totalPaginas, paginaActual + 1)}`}
              aria-disabled={paginaActual >= totalPaginas}
              className={`flex min-h-11 items-center rounded-xl border border-rose-200 bg-white px-4 transition-colors ${
                paginaActual >= totalPaginas ? "pointer-events-none opacity-40" : "hover:bg-rose-50"
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
