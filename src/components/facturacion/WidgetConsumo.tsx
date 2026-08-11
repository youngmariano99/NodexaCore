interface WidgetConsumoProps {
  etiqueta: string;
  usado: number;
  limite: number;
  porcentaje: number;
  className?: string;
}

/**
 * Barra de progreso de consumo frente a un límite contratado (docs/SITEMAP.md
 * "Widget de consumo en /configuracion/facturacion"). Componente
 * puramente presentacional — recibe el porcentaje ya calculado
 * (`calcularPorcentajeUsoSku`, reutilizado tanto para SKU como para cuota de
 * IA: ambos son el mismo cálculo genérico "usado/límite"), mismo criterio
 * que `ContadorCuotaIA`.
 *
 * Paleta (docs/DESIGN.md §5, "Directriz de Negación": nunca comunicar solo
 * por color, nunca rojo punitivo fuera de validación de formularios): el
 * relleno de la barra es siempre `bg-blue-500` (Acento Core), nunca rojo, ni
 * siquiera al llegar o superar el 100% — el bloqueo real de negocio ya lo
 * aplican `crearProducto.ts`/`fn_registrar_consumo_ia` con sus propios
 * códigos de error; esta barra es solo informativa. El ancho visual del
 * relleno se topea en 100% aunque el porcentaje real sea mayor, para no
 * desbordar el contenedor.
 */
export function WidgetConsumo({ etiqueta, usado, limite, porcentaje, className = "" }: WidgetConsumoProps) {
  const anchoRelleno = Math.min(Math.max(porcentaje, 0), 100);

  return (
    <div className={`flex flex-col gap-3 rounded-md border border-slate-700 bg-slate-800 p-6 ${className}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-slate-400">{etiqueta}</span>
        <span className="font-mono text-sm text-blue-500">{porcentaje}%</span>
      </div>

      <span className="font-mono text-2xl text-slate-50">
        {usado.toLocaleString("es-AR")}/{limite.toLocaleString("es-AR")}
      </span>

      <div
        role="progressbar"
        aria-label={etiqueta}
        aria-valuenow={porcentaje}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-slate-700"
      >
        <div
          className="h-full rounded-full bg-blue-500 transition-[width] duration-200"
          style={{ width: `${anchoRelleno}%` }}
        />
      </div>
    </div>
  );
}
