"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type TipoAjustePago = "descuento" | "recargo" | "ninguno";
export type OpcionEntrega = "retiro" | "envio";

export interface ReglaMetodoPago {
  metodoPago: string; // ej: "efectivo", "transferencia", "tarjeta"
  etiqueta: string; // ej: "Efectivo al retirar", "Tarjeta de Débito/Crédito"
  tipoAjuste: TipoAjustePago;
  porcentaje: number; // ej: 10 para 10% de descuento o 5 para 5% de recargo
}

export interface ZonaEnvio {
  id: string;
  nombre: string;
  costo: number;
}

export interface ItemCarrito {
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
  varianteNombre?: string;
  imagenUrl?: string | null;
}

export interface DatosClienteCheckout {
  nombre: string;
  telefono: string;
  direccion?: string;
  notas?: string;
}

const REGLAS_PAGO_POR_DEFECTO: ReglaMetodoPago[] = [
  {
    metodoPago: "efectivo",
    etiqueta: "Efectivo",
    tipoAjuste: "descuento",
    porcentaje: 10,
  },
  {
    metodoPago: "transferencia",
    etiqueta: "Transferencia bancaria",
    tipoAjuste: "ninguno",
    porcentaje: 0,
  },
  {
    metodoPago: "tarjeta",
    etiqueta: "Tarjeta de Crédito / Débito",
    tipoAjuste: "recargo",
    porcentaje: 5,
  },
];

const CLAVE_LOCALSTORAGE_CARRITO = "nodexa_catalogo_carrito";

export function useCarritoCatalogo(
  reglasPagoPersonalizadas: ReglaMetodoPago[] = REGLAS_PAGO_POR_DEFECTO,
  zonasEnvio: ZonaEnvio[] = []
) {
  // Inicialización perezosa (lazy initial state) desde localStorage
  const [items, setItems] = useState<ItemCarrito[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const guardado = localStorage.getItem(CLAVE_LOCALSTORAGE_CARRITO);
      if (guardado) {
        const parsed = JSON.parse(guardado);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Ignorar errores de deserialización
    }
    return [];
  });

  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState<string>("efectivo");
  const [opcionEntrega, setOpcionEntrega] = useState<OpcionEntrega>("retiro");
  const [zonaEnvioId, setZonaEnvioId] = useState<string | null>(null);

  const reglasPago = useMemo(() => {
    return reglasPagoPersonalizadas.length > 0
      ? reglasPagoPersonalizadas
      : REGLAS_PAGO_POR_DEFECTO;
  }, [reglasPagoPersonalizadas]);

  // Persistir cambios del carrito en localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(CLAVE_LOCALSTORAGE_CARRITO, JSON.stringify(items));
    } catch {
      // Ignorar fallos de cuota de storage
    }
  }, [items]);

  const agregarItem = useCallback((nuevoItem: Omit<ItemCarrito, "cantidad">, cantidad = 1) => {
    setItems((itemsActuales) => {
      const indiceExistente = itemsActuales.findIndex(
        (i) => i.productoId === nuevoItem.productoId && i.varianteNombre === nuevoItem.varianteNombre
      );

      if (indiceExistente >= 0) {
        const clon = [...itemsActuales];
        const itemExistente = clon[indiceExistente];
        if (itemExistente) {
          clon[indiceExistente] = {
            ...itemExistente,
            cantidad: itemExistente.cantidad + cantidad,
          };
        }
        return clon;
      }

      return [...itemsActuales, { ...nuevoItem, cantidad }];
    });
  }, []);

  const removerItem = useCallback((productoId: string, varianteNombre?: string) => {
    setItems((itemsActuales) =>
      itemsActuales.filter(
        (i) => !(i.productoId === productoId && i.varianteNombre === varianteNombre)
      )
    );
  }, []);

  const actualizarCantidad = useCallback(
    (productoId: string, cantidad: number, varianteNombre?: string) => {
      if (cantidad <= 0) {
        removerItem(productoId, varianteNombre);
        return;
      }

      setItems((itemsActuales) =>
        itemsActuales.map((i) =>
          i.productoId === productoId && i.varianteNombre === varianteNombre
            ? { ...i, cantidad }
            : i
        )
      );
    },
    [removerItem]
  );

  const vaciarCarrito = useCallback(() => {
    setItems([]);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(CLAVE_LOCALSTORAGE_CARRITO);
      } catch {
        // Ignorar errores de storage
      }
    }
  }, []);

  // 1. Subtotal de productos
  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
  }, [items]);

  // 2. Costo de envío según zona seleccionada
  const zonaEnvioSeleccionada = useMemo(() => {
    return zonasEnvio.find((z) => z.id === zonaEnvioId) ?? null;
  }, [zonasEnvio, zonaEnvioId]);

  const costoEnvio = useMemo(() => {
    if (opcionEntrega === "retiro") return 0;
    return zonaEnvioSeleccionada?.costo ?? 0;
  }, [opcionEntrega, zonaEnvioSeleccionada]);

  // 3. Regla activa de descuento o recargo según método de pago configurado
  const reglaPagoActiva = useMemo(() => {
    return (
      reglasPago.find((r) => r.metodoPago === metodoPagoSeleccionado) ?? {
        metodoPago: metodoPagoSeleccionado,
        etiqueta: metodoPagoSeleccionado,
        tipoAjuste: "ninguno" as TipoAjustePago,
        porcentaje: 0,
      }
    );
  }, [reglasPago, metodoPagoSeleccionado]);

  // Cálculo dinámico de descuento o recargo en dinero
  const montoAjustePago = useMemo(() => {
    if (subtotal <= 0 || reglaPagoActiva.tipoAjuste === "ninguno" || reglaPagoActiva.porcentaje <= 0) {
      return 0;
    }
    const factor = reglaPagoActiva.porcentaje / 100;
    if (reglaPagoActiva.tipoAjuste === "descuento") {
      return -(subtotal * factor);
    }
    return subtotal * factor;
  }, [subtotal, reglaPagoActiva]);

  // Total final calculado
  const total = useMemo(() => {
    return Math.max(0, subtotal + costoEnvio + montoAjustePago);
  }, [subtotal, costoEnvio, montoAjustePago]);

  // Formateador de moneda
  const formatearPrecio = useCallback((monto: number) => {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(monto);
  }, []);

  /**
   * Genera el mensaje formateado para enviar por la API de WhatsApp con el detalle completo del pedido.
   * Criterios de Aceptación: Debe contener Nombre de Cliente, Productos solicitados, método de pago, opción de retiro/envío y el total detallado.
   */
  const generarMensajeComandaWhatsApp = useCallback(
    (datosCliente: DatosClienteCheckout): string => {
      const lineas: string[] = [];

      lineas.push(`🛒 *NUEVO PEDIDO DESDE EL CATÁLOGO WEB*`);
      lineas.push(``);
      lineas.push(`👤 *Cliente:* ${datosCliente.nombre}`);
      lineas.push(`📞 *Teléfono:* ${datosCliente.telefono}`);

      if (opcionEntrega === "envio") {
        lineas.push(`🚚 *Modo de Entrega:* Envío a domicilio`);
        if (datosCliente.direccion) {
          lineas.push(`📍 *Dirección:* ${datosCliente.direccion}`);
        }
        if (zonaEnvioSeleccionada) {
          lineas.push(
            `🗺️ *Zona de Envío:* ${zonaEnvioSeleccionada.nombre} (${formatearPrecio(
              zonaEnvioSeleccionada.costo
            )})`
          );
        }
      } else {
        lineas.push(`🏪 *Modo de Entrega:* Retiro en local`);
      }

      lineas.push(``);
      lineas.push(`📦 *DETALLE DE PRODUCTOS:*`);
      items.forEach((item, index) => {
        const detalleVariante = item.varianteNombre ? ` (${item.varianteNombre})` : "";
        const subtotalItem = formatearPrecio(item.precio * item.cantidad);
        lineas.push(
          `${index + 1}. ${item.nombre}${detalleVariante} x${item.cantidad} = ${subtotalItem}`
        );
      });

      lineas.push(``);
      lineas.push(`💳 *Método de Pago:* ${reglaPagoActiva.etiqueta}`);

      if (reglaPagoActiva.tipoAjuste === "descuento" && reglaPagoActiva.porcentaje > 0) {
        lineas.push(
          `🏷️ *Descuento aplicado (${reglaPagoActiva.porcentaje}%):* -${formatearPrecio(
            Math.abs(montoAjustePago)
          )}`
        );
      } else if (reglaPagoActiva.tipoAjuste === "recargo" && reglaPagoActiva.porcentaje > 0) {
        lineas.push(
          `📈 *Recargo aplicado (${reglaPagoActiva.porcentaje}%):* +${formatearPrecio(
            montoAjustePago
          )}`
        );
      }

      if (datosCliente.notas) {
        lineas.push(``);
        lineas.push(`📝 *Notas adicionales:* ${datosCliente.notas}`);
      }

      lineas.push(``);
      lineas.push(`💰 *RESUMEN DE TOTALES:*`);
      lineas.push(` Subtotal: ${formatearPrecio(subtotal)}`);
      if (opcionEntrega === "envio") {
        lineas.push(` Envío: ${formatearPrecio(costoEnvio)}`);
      }
      if (montoAjustePago !== 0) {
        lineas.push(
          ` Ajuste Pago: ${montoAjustePago < 0 ? "" : "+"}${formatearPrecio(montoAjustePago)}`
        );
      }
      lineas.push(` *TOTAL A PAGAR: ${formatearPrecio(total)}*`);

      return lineas.join("\n");
    },
    [
      items,
      opcionEntrega,
      zonaEnvioSeleccionada,
      reglaPagoActiva,
      subtotal,
      costoEnvio,
      montoAjustePago,
      total,
      formatearPrecio,
    ]
  );

  /**
   * Retorna la URL de WhatsApp wa.me formateada lista para redirigir al cliente
   */
  const obtenerEnlaceWhatsApp = useCallback(
    (telefonoComercio: string, datosCliente: DatosClienteCheckout): string => {
      const mensaje = generarMensajeComandaWhatsApp(datosCliente);
      const telefonoLimpio = telefonoComercio.replace(/\D/g, "");
      return `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
    },
    [generarMensajeComandaWhatsApp]
  );

  return {
    items,
    cantidadTotalItems: items.reduce((acc, i) => acc + i.cantidad, 0),
    subtotal,
    costoEnvio,
    montoAjustePago,
    total,
    metodoPagoSeleccionado,
    opcionEntrega,
    zonaEnvioId,
    reglaPagoActiva,
    reglasPago,
    agregarItem,
    removerItem,
    actualizarCantidad,
    vaciarCarrito,
    setMetodoPagoSeleccionado,
    setOpcionEntrega,
    setZonaEnvioId,
    formatearPrecio,
    generarMensajeComandaWhatsApp,
    obtenerEnlaceWhatsApp,
  };
}
