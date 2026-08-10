export interface ProductoParaCarrito {
  productoId: string;
  sku: string;
  nombre: string;
  precio: number;
  stockDisponible: number;
}

export interface ItemCarrito extends ProductoParaCarrito {
  cantidad: number;
}

export type AccionCarrito =
  | { tipo: "AGREGAR_PRODUCTO"; producto: ProductoParaCarrito }
  | { tipo: "INCREMENTAR_CANTIDAD"; productoId: string }
  | { tipo: "DECREMENTAR_CANTIDAD"; productoId: string }
  | { tipo: "QUITAR_PRODUCTO"; productoId: string }
  | { tipo: "VACIAR_CARRITO" };

export const ESTADO_CARRITO_INICIAL: ItemCarrito[] = [];

/**
 * Reducer puro del carrito del Mostrador (docs/BACKLOG.md "Componente de
 * búsqueda y carrito en Panel de Ventas", Paso 2: `useReducer` en estado
 * local, sin persistencia en `localStorage`/`sessionStorage` — la función en
 * sí no toca ningún storage, y quien la usa (`BuscadorProductos.tsx`) tampoco
 * lo hace, así que el carrito se pierde intencionalmente al recargar la
 * página). Aislado de React para poder cubrirlo con Vitest sin
 * testing-library (no instalado en el repo).
 *
 * La regla de negocio central es el tope por `stockDisponible`: ni
 * `AGREGAR_PRODUCTO` ni `INCREMENTAR_CANTIDAD` dejan que `cantidad` supere el
 * stock que trajo la búsqueda. No es la validación real de venta (eso es
 * `NX-VTA-001`, de la confirmación de cobro — Sprint 6, fuera de esta
 * estación): acá es solo un tope de UX sobre datos que ya pueden estar
 * desactualizados al momento de confirmar.
 */
export function reducirCarrito(estado: ItemCarrito[], accion: AccionCarrito): ItemCarrito[] {
  switch (accion.tipo) {
    case "AGREGAR_PRODUCTO": {
      if (accion.producto.stockDisponible <= 0) {
        return estado;
      }

      const existente = estado.find((item) => item.productoId === accion.producto.productoId);

      if (!existente) {
        return [...estado, { ...accion.producto, cantidad: 1 }];
      }

      if (existente.cantidad >= existente.stockDisponible) {
        return estado;
      }

      return estado.map((item) =>
        item.productoId === accion.producto.productoId ? { ...item, cantidad: item.cantidad + 1 } : item,
      );
    }

    case "INCREMENTAR_CANTIDAD":
      return estado.map((item) =>
        item.productoId === accion.productoId && item.cantidad < item.stockDisponible
          ? { ...item, cantidad: item.cantidad + 1 }
          : item,
      );

    case "DECREMENTAR_CANTIDAD":
      return estado
        .map((item) => (item.productoId === accion.productoId ? { ...item, cantidad: item.cantidad - 1 } : item))
        .filter((item) => item.cantidad > 0);

    case "QUITAR_PRODUCTO":
      return estado.filter((item) => item.productoId !== accion.productoId);

    case "VACIAR_CARRITO":
      return [];

    default:
      return estado;
  }
}

/** Suma `precio * cantidad` de todos los ítems del carrito (ResumenTotal.tsx). */
export function calcularTotalCarrito(items: ItemCarrito[]): number {
  return items.reduce((total, item) => total + item.precio * item.cantidad, 0);
}
