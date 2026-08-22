"use server";

import { z } from "zod";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { EstadoActualizarConfiguracionBot } from "@/services/botWhatsapp/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

function normalizarMensaje(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const recortado = valor.trim();
  return recortado.length > 0 ? recortado : null;
}

const esquemaActualizarConfiguracionBot = z
  .object({
    activo: z.preprocess((valor) => valor === "true" || valor === "on", z.boolean()),
    mensajeHorarios: z.preprocess(normalizarMensaje, z.string().nullable()),
    mensajeUbicacion: z.preprocess(normalizarMensaje, z.string().nullable()),
    mensajeCatalogo: z.preprocess(normalizarMensaje, z.string().nullable()),
    permiteDerivarWhatsapp: z.preprocess((valor) => valor === "true" || valor === "on", z.boolean()),
  })
  .superRefine((datos, ctx) => {
    const tieneAlMenosUnMensaje = Boolean(
      datos.mensajeHorarios || datos.mensajeUbicacion || datos.mensajeCatalogo,
    );

    if (datos.activo && !tieneAlMenosUnMensaje) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["activo"],
        message: "NX-BOT-002",
      });
    }
  });

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaModuloBotWhatsapp {
  activo: boolean;
}

interface FilaConfiguracionBotPrevia {
  activo: boolean;
  mensaje_horarios: string | null;
  mensaje_ubicacion: string | null;
  mensaje_catalogo: string | null;
}

interface FilaConfiguracionBot {
  cliente_id: string;
  activo: boolean;
  mensaje_horarios: string | null;
  mensaje_ubicacion: string | null;
  mensaje_catalogo: string | null;
}

/**
 * Configuración de mensajes automáticos del bot (docs/ROLES.md §2, fila
 * "configuracion_bot_whatsapp": `C·L·M` exclusivo de comerciante, `empleado`
 * sin ninguna fila de la matriz — a diferencia de otras tablas de negocio
 * donde empleado sí tiene algún acceso). El upsert corre con el cliente de
 * sesión (RLS), sin necesitar `SECURITY DEFINER`: a diferencia de
 * `actualizarIdentidadVisual`/`registrarPagoCuentaCorriente`, acá no hay
 * ninguna columna reservada a otro rol dentro de la misma fila que proteger
 * — comerciante puede escribir la fila completa de su propio tenant. La
 * política RLS `configuracion_bot_whatsapp_update_tenant` original (heredada
 * del patrón genérico de la migración inicial) no distinguía rol dentro del
 * tenant; se restringió a comerciante en una migración nueva para que
 * coincida con la matriz de permisos y no dependa únicamente de este chequeo
 * de aplicación.
 */
export async function actualizarConfiguracionBot(
  _estadoPrevio: EstadoActualizarConfiguracionBot,
  formData: FormData,
): Promise<EstadoActualizarConfiguracionBot> {
  const resultado = esquemaActualizarConfiguracionBot.safeParse({
    activo: formData.get("activo"),
    mensajeHorarios: formData.get("mensaje_horarios"),
    mensajeUbicacion: formData.get("mensaje_ubicacion"),
    mensajeCatalogo: formData.get("mensaje_catalogo"),
    permiteDerivarWhatsapp: formData.get("permite_derivar_whatsapp"),
  });

  if (!resultado.success) {
    const esErrorDeCuotaDeMensajes = resultado.error.issues.some(
      (issue) => issue.path[0] === "activo" && issue.message === "NX-BOT-002",
    );
    return { error: esErrorDeCuotaDeMensajes ? "NX-BOT-002" : "NX-SYS-006", exito: false };
  }

  const supabase = await crearClienteSupabaseServidor();

  const {
    data: { user: usuarioAutenticado },
  } = await supabase.auth.getUser();

  if (!usuarioAutenticado) {
    return { error: "NX-SYS-002", exito: false };
  }

  const { data: solicitante, error: errorSolicitante } = await supabase
    .from("usuarios")
    .select("usuario_id, rol, cliente_id")
    .eq("auth_user_id", usuarioAutenticado.id)
    .is("eliminado_en", null)
    .single<FilaUsuarioSolicitante>();

  if (errorSolicitante || !solicitante) {
    return { error: "NX-SYS-001", exito: false };
  }

  if (solicitante.rol !== "comerciante" || !solicitante.cliente_id) {
    return { error: "NX-SYS-003", exito: false };
  }

  const clienteId = solicitante.cliente_id;

  const { data: moduloBot } = await supabase
    .from("tenant_modules")
    .select("activo")
    .eq("cliente_id", clienteId)
    .eq("modulo", "bot_whatsapp")
    .maybeSingle<FilaModuloBotWhatsapp>();

  if (!moduloBot?.activo) {
    return { error: "NX-BOT-001", exito: false };
  }

  const { data: valoresPrevios } = await supabase
    .from("configuracion_bot_whatsapp")
    .select("activo, mensaje_horarios, mensaje_ubicacion, mensaje_catalogo, permite_derivar_whatsapp")
    .eq("cliente_id", clienteId)
    .maybeSingle<FilaConfiguracionBotPrevia & { permite_derivar_whatsapp: boolean }>();

  const { data: configuracion, error: errorUpsert } = await supabase
    .from("configuracion_bot_whatsapp")
    .upsert(
      {
        cliente_id: clienteId,
        activo: resultado.data.activo,
        mensaje_horarios: resultado.data.mensajeHorarios,
        mensaje_ubicacion: resultado.data.mensajeUbicacion,
        mensaje_catalogo: resultado.data.mensajeCatalogo,
        permite_derivar_whatsapp: resultado.data.permiteDerivarWhatsapp,
        actualizado_en: new Date().toISOString(),
      },
      { onConflict: "cliente_id" },
    )
    .select("cliente_id, activo, mensaje_horarios, mensaje_ubicacion, mensaje_catalogo, permite_derivar_whatsapp")
    .single<FilaConfiguracionBot & { permite_derivar_whatsapp: boolean }>();

  if (errorUpsert || !configuracion) {
    return { error: "NX-SYS-001", exito: false };
  }

  const camposComparados: Array<{
    campo: "activo" | "mensaje_horarios" | "mensaje_ubicacion" | "mensaje_catalogo" | "permite_derivar_whatsapp";
    anterior: string | null;
    nuevo: string | null;
  }> = [
    {
      campo: "activo",
      anterior: valoresPrevios ? String(valoresPrevios.activo) : null,
      nuevo: String(configuracion.activo),
    },
    {
      campo: "mensaje_horarios",
      anterior: valoresPrevios?.mensaje_horarios ?? null,
      nuevo: configuracion.mensaje_horarios,
    },
    {
      campo: "mensaje_ubicacion",
      anterior: valoresPrevios?.mensaje_ubicacion ?? null,
      nuevo: configuracion.mensaje_ubicacion,
    },
    {
      campo: "mensaje_catalogo",
      anterior: valoresPrevios?.mensaje_catalogo ?? null,
      nuevo: configuracion.mensaje_catalogo,
    },
    {
      campo: "permite_derivar_whatsapp",
      anterior: valoresPrevios ? String(valoresPrevios.permite_derivar_whatsapp) : null,
      nuevo: String(configuracion.permite_derivar_whatsapp),
    },
  ];

  for (const { campo, anterior, nuevo } of camposComparados) {
    if (anterior === nuevo) continue;

    registrarDiff({
      clienteId,
      usuarioId: solicitante.usuario_id,
      tablaAfectada: "configuracion_bot_whatsapp",
      registroId: clienteId,
      campoModificado: campo,
      valorAnterior: anterior,
      valorNuevo: nuevo,
    });
  }

  return { error: null, exito: true };
}
