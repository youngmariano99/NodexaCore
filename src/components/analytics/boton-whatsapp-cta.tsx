"use client";

import { MessageCircle } from "lucide-react";

import { registrarClicWhatsapp } from "@/lib/analytics/eventos";

interface BotonWhatsappCtaProps {
  clienteId: string;
  productoId: string;
  productoNombre: string;
  precio?: number;
  numeroWhatsapp: string;
  mensaje?: string;
  className?: string;
}

/**
 * CTA de WhatsApp de la ficha de producto pública (docs/BACKLOG.md
 * "Componente de CTA WhatsApp en ficha de producto"). El enlace
 * `https://wa.me/{telefono}?text=...` se arma acá con el nombre del
 * producto pre-cargado en el mensaje (Paso 2 / Criterio de Aceptación 1);
 * `numeroWhatsapp` llega ya resuelto desde `clientes.telefono_whatsapp`
 * (nunca hardcodeado). `min-h-11 min-w-11` cumple el área táctil mínima de
 * 44x44px (docs/DESIGN.md `min-touch-target`, Paso 3 / Criterio de
 * Aceptación 2) incluso si algún día este botón se usa sin texto visible.
 *
 * El evento `clic_whatsapp` (Paso 4 / Criterio de Aceptación 3) viaja por
 * `registrarClicWhatsapp` → Nave Nodriza, no PostHog: el ticket original de
 * instrumentación de analítica de negocio (Sprint 1, "Instrumentar PostHog
 * para métricas de negocio") fue redirigido explícitamente por el usuario a
 * Nave Nodriza (telemetría propia de AppyStudio) — decisión ya tomada y
 * documentada, no se reintroduce PostHog acá. El evento ya incluye
 * `cliente_id` como propiedad (`producto_id`, `producto_nombre` y `precio`
 * también viajan, útiles para el mismo análisis de conversión).
 */
export function BotonWhatsappCta({
  clienteId,
  productoId,
  productoNombre,
  precio,
  numeroWhatsapp,
  mensaje,
  className,
}: BotonWhatsappCtaProps) {
  const textoMensaje = mensaje ?? `Hola, quiero consultar por ${productoNombre}`;
  const enlaceWhatsapp = `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(textoMensaje)}`;

  return (
    <a
      href={enlaceWhatsapp}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        "flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 text-base font-medium text-white transition-colors duration-150 hover:bg-emerald-600"
      }
      onClick={() => {
        registrarClicWhatsapp({ clienteId, productoId, productoNombre, precio });
      }}
    >
      <MessageCircle className="h-5 w-5" aria-hidden="true" />
      Consultar por WhatsApp
    </a>
  );
}
