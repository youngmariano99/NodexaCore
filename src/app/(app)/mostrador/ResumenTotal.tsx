import {
  calcularTotalVentaConAjuste,
  type TipoAjustePago,
  type VentaItem,
} from "@/lib/dominio/ventas/calcularTotalVenta";
import type { ItemCarrito } from "@/lib/dominio/ventas/carritoReducer";

const FORMATO_PRECIO = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

interface ResumenTotalProps {
  items: ItemCarrito[];
  tipoAjuste?: TipoAjustePago;
  porcentaje?: number;
  etiquetaMetodo?: string;
}

function aItemsDeVenta(items: ItemCarrito[]): VentaItem[] {
  return items.map((item) => ({
    productoId: item.productoId,
    precioUnitario: item.precio,
    cantidad: item.cantidad,
  }));
}

export function ResumenTotal({
  items,
  tipoAjuste = "ninguno",
  porcentaje = 0,
  etiquetaMetodo,
}: ResumenTotalProps) {
  const totalUnidades = items.reduce((total, item) => total + item.cantidad, 0);
  const { subtotalBruto, montoAjuste, totalFinal } = calcularTotalVentaConAjuste(
    aItemsDeVenta(items),
    tipoAjuste,
    porcentaje
  );

  const tieneAjuste = tipoAjuste !== "ninguno" && porcentaje > 0 && subtotalBruto > 0;

  return (
    <div className="flex flex-col gap-3 rounded-md border border-[#222A27] bg-[#111615] p-4">
      {tieneAjuste ? (
        <div className="flex flex-col gap-1.5 border-b border-[#222A27] pb-3 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span>Subtotal de productos ({totalUnidades} un.)</span>
            <span className="font-mono">{FORMATO_PRECIO.format(subtotalBruto)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">
              {tipoAjuste === "descuento" ? "Descuento" : "Recargo"} ({etiquetaMetodo || "Método de pago"}{" "}
              {porcentaje}%)
            </span>
            <span
              className={`font-mono font-medium ${
                tipoAjuste === "descuento" ? "text-emerald-400" : "text-purple-400"
              }`}
            >
              {montoAjuste > 0 ? `+${FORMATO_PRECIO.format(montoAjuste)}` : FORMATO_PRECIO.format(montoAjuste)}
            </span>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          {!tieneAjuste ? (
            <span className="text-xs text-slate-400">
              {totalUnidades} unidad{totalUnidades === 1 ? "" : "es"} en el carrito
            </span>
          ) : null}
          <span className="text-sm font-semibold text-slate-50">Total a cobrar</span>
        </div>
        <span className="font-mono text-2xl font-semibold text-slate-50">
          {FORMATO_PRECIO.format(totalFinal)}
        </span>
      </div>
    </div>
  );
}
