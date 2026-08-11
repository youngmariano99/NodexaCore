"use server";

import { z } from "zod";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { construirNotificacionEstadoPago } from "@/lib/dominio/facturacion/construirNotificacionEstadoPago";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { ResultadoRepositorio } from "@/repositories/base/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

const esquemaActualizarEstadoPago = z.object({
  clienteId: z.string().uuid("El cliente_id debe ser un UUID válido."),
  nuevoEstadoPago: z.boolean({ message: "El nuevo estado de pago es obligatorio." }),
});

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
}

interface FilaCliente {
  nombre_comercio: string;
  telefono_whatsapp: string;
  estado_pago: boolean;
}

interface ResultadoActualizarEstadoPago {
  estadoPago: boolean;
  notificacion: {
    mensaje: string;
    enlaceWhatsapp: string;
  };
}

/**
 * Suspensión/reactivación de `estado_pago` (docs/ROLES.md §2, fila
 * "Facturación / estado_pago": `C·M` exclusivo de admin_nodexa). El UPDATE
 * corre con el cliente de sesión: `clientes_update_admin` (docs/ROLES.md
 * §3.6) ya autoriza `es_admin_nodexa()` sobre esta columna, sin necesitar
 * `service_role`, mismo criterio ya usado por `ampliarLimiteSku`.
 *
 * El "flujo SOP-04 (recordatorio, contacto, suspensión al día 30)" del Paso 2
 * es un proceso operativo externo a la app (contacto humano por WhatsApp del
 * admin con el comercio, seguimiento de días en mora): docs/SCHEMA.md no
 * define ninguna entidad de facturación/recordatorios que persista ese
 * estado intermedio (mismo vacío ya documentado en `ampliarLimiteSku` sobre
 * planes/precios), así que no hay una máquina de estados que modelar acá —
 * el admin decide off-platform cuándo el comercio llegó al día 30 sin
 * respuesta, y esta acción ejecuta el único paso realmente automatizable:
 * el cambio de `estado_pago` en sí, su auditoría y la notificación.
 *
 * "Enviar notificación por WhatsApp" (Paso 4) no puede ser un envío
 * automático real: el proyecto no tiene ninguna integración con un proveedor
 * de WhatsApp Business (confirmado también en la estación del FAQ del bot,
 * `docs/ERRORS.md` NX-BOT-003). Se resuelve con el mismo patrón `wa.me` ya
 * usado en toda la vidriera pública — se retorna el enlace pre-armado para
 * que la UI de `/admin/morosidad` (todavía no construida, docs/SITEMAP.md)
 * lo renderice como CTA de un clic, en vez de fingir un envío silencioso que
 * en realidad nunca ocurrió.
 *
 * El acceso al panel (Criterio de Aceptación 1) se cierra en `src/proxy.ts`:
 * `custom_access_token_hook` ahora también inyecta `estado_pago` como claim
 * del JWT para comerciante/empleado, y el proxy redirige a `/login` con
 * `NX-ADM-002` cuando viene en `false` — mismo mecanismo ya usado para
 * `rol`/`cliente_id` desde la estación de login (Sprint 1), sujeto a la
 * misma ventana de refresco de token ya documentada en CLAUDE.md (JWT ≤ 1h).
 * La vidriera pública ya lo cumplía desde antes (`clientes_lectura_publica`
 * filtra `estado_pago = true`).
 */
export async function actualizarEstadoPago(
  clienteId: string,
  nuevoEstadoPago: boolean,
): Promise<ResultadoRepositorio<ResultadoActualizarEstadoPago>> {
  const resultado = esquemaActualizarEstadoPago.safeParse({ clienteId, nuevoEstadoPago });

  if (!resultado.success) {
    return { ok: false, error: "NX-SYS-006" };
  }

  const supabase = await crearClienteSupabaseServidor();

  const {
    data: { user: usuarioAutenticado },
  } = await supabase.auth.getUser();

  if (!usuarioAutenticado) {
    return { ok: false, error: "NX-SYS-002" };
  }

  const { data: solicitante, error: errorSolicitante } = await supabase
    .from("usuarios")
    .select("usuario_id, rol")
    .eq("auth_user_id", usuarioAutenticado.id)
    .is("eliminado_en", null)
    .single<FilaUsuarioSolicitante>();

  if (errorSolicitante || !solicitante) {
    return { ok: false, error: "NX-SYS-001" };
  }

  if (solicitante.rol !== "admin_nodexa") {
    return { ok: false, error: "NX-SYS-003" };
  }

  const { data: cliente, error: errorCliente } = await supabase
    .from("clientes")
    .select("nombre_comercio, telefono_whatsapp, estado_pago")
    .eq("cliente_id", resultado.data.clienteId)
    .is("eliminado_en", null)
    .single<FilaCliente>();

  if (errorCliente || !cliente) {
    return { ok: false, error: "NX-SYS-004" };
  }

  const estadoAnterior = cliente.estado_pago;

  const { data: clienteActualizado, error: errorActualizacion } = await supabase
    .from("clientes")
    .update({ estado_pago: resultado.data.nuevoEstadoPago })
    .eq("cliente_id", resultado.data.clienteId)
    .select("estado_pago")
    .single<{ estado_pago: boolean }>();

  if (errorActualizacion || !clienteActualizado) {
    return { ok: false, error: "NX-SYS-001" };
  }

  registrarDiff({
    clienteId: resultado.data.clienteId,
    usuarioId: solicitante.usuario_id,
    tablaAfectada: "clientes",
    registroId: resultado.data.clienteId,
    campoModificado: "estado_pago",
    valorAnterior: String(estadoAnterior),
    valorNuevo: String(clienteActualizado.estado_pago),
  });

  const notificacion = construirNotificacionEstadoPago(
    cliente.nombre_comercio,
    cliente.telefono_whatsapp,
    clienteActualizado.estado_pago,
  );

  return {
    ok: true,
    data: {
      estadoPago: clienteActualizado.estado_pago,
      notificacion,
    },
  };
}
