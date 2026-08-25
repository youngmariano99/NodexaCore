import { calcularTotalVenta, type VentaItem } from "@/lib/dominio/ventas/calcularTotalVenta";
import type { ItemCarrito } from "@/lib/dominio/ventas/carritoReducer";

const FORMATO_PRECIO = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

interface ResumenTotalProps {
  items: ItemCarrito[];
}

function aItemsDeVenta(items: ItemCarrito[]): VentaItem[] {
  return items.map((item) => ({ productoId: item.productoId, precioUnitario: item.precio, cantidad: item.cantidad }));
}

/**
 * Resumen del total a cobrar (docs/BACKLOG.md "Componente de búsqueda y
 * carrito en Panel de Ventas", Paso 3). Previsualización client-side:
 * consume la misma `calcularTotalVenta` (docs/BACKLOG.md "Cálculo automático
 * del total de la venta") que la validación final del servidor en
 * `POST /api/ventas/previsualizar`, así que el número que ve el cajero acá
 * es exactamente el mismo cálculo que recalculará el servidor — nunca dos
 * fórmulas de redondeo distintas que puedan divergir en un centavo. La
 * confirmación de cobro con control de duplicados es una historia aparte
 * (Sprint 6), fuera de esta estación.
 */
export function ResumenTotal({ items }: ResumenTotalProps) {
  const totalUnidades = items.reduce((total, item) => total + item.cantidad, 0);
  const total = calcularTotalVenta(aItemsDeVenta(items));

  return (
    <div className="flex items-center justify-between rounded-md border border-[#222A27] bg-[#111615] px-4 py-4">
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
