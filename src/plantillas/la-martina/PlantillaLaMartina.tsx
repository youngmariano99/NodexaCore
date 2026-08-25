import Link from "next/link";
import type { PlantillaProps } from "../tipos";

const FORMATO_PRECIO = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

export default function PlantillaLaMartina({
  cliente,
  productos,
  totalPaginas = 1,
  paginaActual = 1,
  clienteSlug = "",
}: PlantillaProps) {
  return (
    <div className="flex flex-1 flex-col bg-slate-950 text-slate-100 font-serif">
      <header className="flex flex-col items-center border-b border-amber-900/30 bg-slate-900/90 px-6 py-12 text-center">
        {cliente.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cliente.logo_url}
            alt={cliente.nombre_comercio}
            className="h-20 w-20 rounded-full border-2 border-amber-500/50 bg-slate-950 object-contain p-1 shadow-lg"
          />
        ) : null}
        <h1 className="mt-4 text-3xl font-light tracking-widest text-amber-100 uppercase">{cliente.nombre_comercio}</h1>
        <span className="mt-2 inline-flex items-center rounded-full border border-amber-500/30 bg-amber-950/40 px-3 py-1 text-xs font-sans tracking-wider text-amber-300 uppercase">
          Colección La Martina
        </span>
        <p className="mt-2 text-xs font-sans tracking-wide text-slate-400">
          Catálogo Exclusivo • {productos.length} Productos Seleccionados
        </p>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
        {productos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-amber-900/20 bg-slate-900/40 px-6 py-16 text-center">
            <p className="text-lg text-amber-200">Próximamente disponible.</p>
            <p className="text-xs text-slate-400 font-sans">El comercio está preparando su catálogo boutique.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {productos.map((producto) => (
              <li key={producto.producto_id}>
                <Link
                  href={clienteSlug ? `/c/${clienteSlug}/producto/${producto.producto_id}` : "#"}
                  className="group flex h-full flex-col overflow-hidden rounded-lg border border-amber-900/20 bg-slate-900/60 transition-all duration-300 hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-950/20"
                >
                  <div className="aspect-4/3 w-full overflow-hidden bg-slate-950">
                    {producto.imagen_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={producto.imagen_url}
                        alt={producto.nombre}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col p-5 font-sans">
                    {producto.categoria ? (
                      <span className="text-2xs uppercase tracking-widest text-amber-400/80">{producto.categoria}</span>
                    ) : null}
                    <h2 className="mt-1 font-serif text-lg text-slate-100 line-clamp-2">{producto.nombre}</h2>
                    <span className="mt-4 font-mono text-base font-semibold text-amber-300">
                      {FORMATO_PRECIO.format(producto.precio)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {totalPaginas > 1 ? (
          <nav className="flex items-center justify-between text-xs font-sans text-slate-400" aria-label="Paginación del catálogo">
            <Link
              href={`/c/${clienteSlug}?page=${Math.max(1, paginaActual - 1)}`}
              aria-disabled={paginaActual <= 1}
              className={`flex min-h-11 items-center rounded border border-amber-900/30 px-4 transition-colors ${
                paginaActual <= 1 ? "pointer-events-none opacity-30" : "hover:border-amber-500/50 text-amber-200"
              }`}
            >
              ← Anterior
            </Link>
            <span className="font-mono text-amber-300/80">
              Página {paginaActual} / {totalPaginas}
            </span>
            <Link
              href={`/c/${clienteSlug}?page=${Math.min(totalPaginas, paginaActual + 1)}`}
              aria-disabled={paginaActual >= totalPaginas}
              className={`flex min-h-11 items-center rounded border border-amber-900/30 px-4 transition-colors ${
                paginaActual >= totalPaginas ? "pointer-events-none opacity-30" : "hover:border-amber-500/50 text-amber-200"
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
