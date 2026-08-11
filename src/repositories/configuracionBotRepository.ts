import * as Sentry from "@sentry/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface FilaConfiguracionBotPublica {
  mensaje_horarios: string | null;
  mensaje_ubicacion: string | null;
  mensaje_catalogo: string | null;
  permite_derivar_whatsapp: boolean;
}

interface FilaModuloBotWhatsapp {
  activo: boolean;
}

interface FilaConfiguracionBotConsultada {
  activo: boolean;
  mensaje_horarios: string | null;
  mensaje_ubicacion: string | null;
  mensaje_catalogo: string | null;
  permite_derivar_whatsapp: boolean;
}

/**
 * Configuración pública del bot para el FAQ de la vidriera (docs/ROLES.md §2,
 * fila "configuracion_bot_whatsapp": `cliente_final` tiene `L (respuesta
 * automática, sin ver config)`). Devuelve `null` tanto si el tenant nunca
 * contrató `bot_whatsapp`, como si lo desactivó, como si el comerciante
 * apagó `activo` en su configuración (Criterio de Aceptación "bot
 * desactivado ⇒ ninguna respuesta automática") — el llamador no necesita
 * distinguir esos tres casos, todos significan "no mostrar el widget".
 *
 * Un error real de Postgres/red (no una fila ausente) se registra como
 * `NX-BOT-003` (docs/ERRORS.md) vía Sentry sin lanzar: la vidriera pública
 * debe seguir sirviendo el catálogo aunque el bot falle (Paso 4 del
 * checklist, "sin bloquear el uso del panel").
 */
export async function obtenerConfiguracionBotPublica(
  supabase: SupabaseClient,
  clienteId: string,
): Promise<FilaConfiguracionBotPublica | null> {
  const { data: modulo, error: errorModulo } = await supabase
    .from("tenant_modules")
    .select("activo")
    .eq("cliente_id", clienteId)
    .eq("modulo", "bot_whatsapp")
    .maybeSingle<FilaModuloBotWhatsapp>();

  if (errorModulo) {
    registrarFalloBotWhatsapp(clienteId, "tenant_modules", errorModulo);
    return null;
  }

  if (!modulo?.activo) {
    return null;
  }

  const { data: configuracion, error: errorConfiguracion } = await supabase
    .from("configuracion_bot_whatsapp")
    .select("activo, mensaje_horarios, mensaje_ubicacion, mensaje_catalogo, permite_derivar_whatsapp")
    .eq("cliente_id", clienteId)
    .eq("activo", true)
    .maybeSingle<FilaConfiguracionBotConsultada>();

  if (errorConfiguracion) {
    registrarFalloBotWhatsapp(clienteId, "configuracion_bot_whatsapp", errorConfiguracion);
    return null;
  }

  if (!configuracion) {
    return null;
  }

  return {
    mensaje_horarios: configuracion.mensaje_horarios,
    mensaje_ubicacion: configuracion.mensaje_ubicacion,
    mensaje_catalogo: configuracion.mensaje_catalogo,
    permite_derivar_whatsapp: configuracion.permite_derivar_whatsapp,
  };
}

function registrarFalloBotWhatsapp(clienteId: string, tabla: string, error: unknown): void {
  Sentry.captureMessage("Fallo al recuperar la configuración pública del bot de WhatsApp", {
    level: "warning",
    tags: { modulo: "bot_whatsapp", codigo_error: "NX-BOT-003", tabla },
    extra: { clienteId, error },
  });
}
