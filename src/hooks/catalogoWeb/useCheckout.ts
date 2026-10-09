import { useState, useTransition } from "react";
import {
  procesarPedidoWeb,
  InputProcesarPedidoWeb,
} from "@/services/catalogoWeb/procesarPedidoWeb";

export interface ConfiguracionCheckout {
  clienteId: string;
  telefonoWhatsapp: string | null;
  nombreComercio: string;
  tieneModuloComandas: boolean;
}

export function useCheckout(config: ConfiguracionCheckout) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 2,
    }).format(valor);
  };

  const generarMensajeWhatsapp = (payload: InputProcesarPedidoWeb) => {
    let mensaje = `¡Hola ${config.nombreComercio}!\n`;
    mensaje += `Quiero realizar un pedido:\n\n`;

    payload.items.forEach((item) => {
      mensaje += `- ${item.cantidad}x ${item.nombre} (${formatearMoneda(
        item.precioUnitario
      )})\n`;
    });

    const total = payload.subtotal + payload.costoEnvio;
    mensaje += `\n*Subtotal:* ${formatearMoneda(payload.subtotal)}`;
    if (payload.costoEnvio > 0) {
      mensaje += `\n*Envío:* ${formatearMoneda(payload.costoEnvio)}`;
    }
    mensaje += `\n*Total:* ${formatearMoneda(total)}\n\n`;

    mensaje += `*Mis datos:*\n`;
    mensaje += `Nombre: ${payload.datosCliente.nombre}\n`;
    if (payload.opcionEntrega === "envio") {
      mensaje += `Entrega: Envío a domicilio\n`;
      mensaje += `Dirección: ${payload.datosCliente.direccion || "No especificada"}\n`;
    } else {
      mensaje += `Entrega: Retiro en local\n`;
    }

    mensaje += `Pago: ${payload.metodoPago === "efectivo" ? "Efectivo" : payload.metodoPago === "transferencia" ? "Transferencia" : "Tarjeta"}\n`;

    if (payload.datosCliente.notas) {
      mensaje += `Notas: ${payload.datosCliente.notas}\n`;
    }

    return encodeURIComponent(mensaje);
  };

  const procesarCheckout = async (payload: InputProcesarPedidoWeb) => {
    setError(null);

    // Módulo Básico: Derivación a WhatsApp
    if (!config.tieneModuloComandas) {
      if (!config.telefonoWhatsapp) {
        setError("El comercio no tiene configurado un teléfono de WhatsApp.");
        return { exito: false, tipo: "whatsapp" as const };
      }

      const numeroLimpio = config.telefonoWhatsapp.replace(/\D/g, "");
      const mensaje = generarMensajeWhatsapp(payload);
      const urlWhatsapp = `https://api.whatsapp.com/send?phone=${numeroLimpio}&text=${mensaje}`;

      window.open(urlWhatsapp, "_blank", "noopener,noreferrer");
      return { exito: true, tipo: "whatsapp" as const };
    }

    // Módulo Avanzado: Comandas / Kanban
    return new Promise<{ exito: boolean; tipo: "comandas"; pedidoId?: string }>(
      (resolve) => {
        startTransition(async () => {
          try {
            const resultado = await procesarPedidoWeb(payload);
            if (!resultado.exito) {
              setError(resultado.error || "Ocurrió un error al enviar el pedido.");
              resolve({ exito: false, tipo: "comandas" });
            } else {
              resolve({
                exito: true,
                tipo: "comandas",
                pedidoId: resultado.pedidoId,
              });
            }
          } catch {
            setError("NX-SYS-001");
            resolve({ exito: false, tipo: "comandas" });
          }
        });
      }
    );
  };

  return {
    procesarCheckout,
    isSubmitting: isPending,
    error,
  };
}
