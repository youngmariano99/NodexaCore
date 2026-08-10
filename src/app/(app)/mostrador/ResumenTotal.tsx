import { calcularTotalCarrito, type ItemCarrito } from "@/lib/dominio/ventas/carritoReducer";

const FORMATO_PRECIO = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

interface ResumenTotalProps {
  items: ItemCarrito[];
}

/**
 * Resumen del total a cobrar (docs/BACKLOG.md Paso 3: subcomponente propio).
 * Solo presenta el cálculo de `calcularTotalCarrito` — la confirmación de
 * cobro con control de duplicados es una historia aparte (Sprint 6), fuera
 * de esta estación.
 */
export function ResumenTotal({ items }: ResumenTotalProps) {
  const totalUnidades = items.reduce((total, item) => total + item.cantidad, 0);
  const total = calcularTotalCarrito(items);

  return (
    <div className="flex items-center justify-between rounded-md border border-slate-700 bg-slate-800 px-4 py-4">
      <div className="flex flex-col">
        <span className="text-xs text-slate-400">
          {totalUnidades} unidad{totalUnidades === 1 ? "" : "es"} en el carrito
        </span>
        <span className="text-sm font-medium text-slate-50">Total a cobrar</span>
      </div>
      <span className="font-mono text-2xl font-semibold text-slate-50">{FORMATO_PRECIO.format(total)}</span>
    </div>
  );
}
