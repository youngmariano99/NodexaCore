import Link from "next/link";
import type { PlantillaProps } from "../tipos";

const FORMATO_PRECIO = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
const COLOR_DEFECTO = "#16D39A";

export default function PlantillaBasica({
  cliente,
  productos,
  totalPaginas = 1,
  paginaActual = 1,
  clienteSlug = "",
}: PlantillaProps) {
  const colorPrimario = cliente.color_primario || COLOR_DEFECTO;

  return (
    <div className="flex flex-1 flex-col bg-white text-slate-900">
      <header
        className="flex flex-col items-center gap-3 px-6 py-10 text-center"
        style={{ backgroundColor: `${colorPrimario}1A` }}
      >
        {cliente.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cliente.logo_url}
            alt={cliente.nombre_comercio}
            className="h-16 w-16 rounded-full border border-slate-200 bg-white object-contain"
          />
        ) : null}
        <h1 className="text-2xl font-semibold text-slate-900">{cliente.nombre_comercio}</h1>
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          Plantilla Básica
        </span>
        <p className="text-sm text-slate-600">
          {productos.length} producto{productos.length === 1 ? "" : "s"} disponible{productos.length === 1 ? "" : "s"}
        </p>
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
                  href={clienteSlug ? `/c/${clienteSlug}/producto/${producto.producto_id}` : "#"}
                  className="flex h-full flex-col overflow-hidden rounded-md border border-slate-200 transition-shadow duration-150 hover:shadow-md"
                >
                  <div className="aspect-square w-full bg-slate-100">
                    {producto.imagen_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
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
