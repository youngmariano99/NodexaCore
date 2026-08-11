export interface NotificacionEstadoPago {
  mensaje: string;
  enlaceWhatsapp: string;
}

/**
 * Arma la notificación de WhatsApp para el comercio afectado por un cambio
 * de `estado_pago` (Paso 4 del checklist, docs/ERRORS.md `NX-ADM-002`: "Mostrar
 * contacto directo por WhatsApp según SOP-04"). El proyecto no tiene ninguna
 * integración con un proveedor real de WhatsApp Business (ni credenciales en
 * `env.ts`, confirmado también en la estación del FAQ del bot) — no existe
 * forma de enviar el mensaje de forma 100% automática y silenciosa. Se
 * modela con el mismo patrón `wa.me` ya usado en todo el resto del repo
 * (`BotonWhatsappCta`, `BotFaqCatalogo`): un enlace pre-armado con el mensaje
 * correcto, listo para que `admin_nodexa` lo dispare con un clic desde el
 * futuro panel de morosidad (`/admin/morosidad`, docs/SITEMAP.md SOP-04).
 */
export function construirNotificacionEstadoPago(
  nombreComercio: string,
  telefonoWhatsapp: string,
  nuevoEstadoPago: boolean,
): NotificacionEstadoPago {
  const mensaje = nuevoEstadoPago
    ? `Hola ${nombreComercio}, te confirmamos que tu cuenta en Nodexa fue reactivada. Ya podés acceder a tu panel y a tu vidriera web con normalidad.`
    : `Hola ${nombreComercio}, tu cuenta en Nodexa fue suspendida por falta de pago. Regularizá tu situación para reactivar el acceso a tu panel y a tu vidriera web.`;

  return {
    mensaje,
    enlaceWhatsapp: `https://wa.me/${telefonoWhatsapp}?text=${encodeURIComponent(mensaje)}`,
  };
}
