"use server";

import { z } from "zod";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { ResultadoRepositorio } from "@/repositories/base/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

import { transformarTelefono } from "@/lib/validaciones/transformadores";

const esquemaActualizarDatosComercio = z.object({
  nombreComercio: z.string().min(1, "El nombre del comercio es obligatorio."),
  telefonoWhatsapp: z
    .string()
    .transform(transformarTelefono)
    .refine((val) => val !== null && val.length >= 8, { message: "El número de WhatsApp debe ser válido." }),
  logoUrl: z.string().url("El logo debe ser una URL válida.").or(z.literal("")).nullable(),
});

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
  cliente_id: string | null;
}

export async function actualizarDatosComercio(
  nombreComercio: string,
  telefonoWhatsapp: string,
  logoUrl: string | null
): Promise<ResultadoRepositorio<{ nombreComercio: string; telefonoWhatsapp: string; logoUrl: string | null }>> {
  const validacion = esquemaActualizarDatosComercio.safeParse({ nombreComercio, telefonoWhatsapp, logoUrl });
  if (!validacion.success) {
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
    .select("usuario_id, rol, cliente_id")
    .eq("auth_user_id", usuarioAutenticado.id)
    .is("eliminado_en", null)
    .single<FilaUsuarioSolicitante>();

  if (errorSolicitante || !solicitante) {
    return { ok: false, error: "NX-SYS-001" };
  }

  // Solo el comerciante puede modificar los datos del comercio
  if (solicitante.rol !== "comerciante" || !solicitante.cliente_id) {
    return { ok: false, error: "NX-SYS-003" };
  }

  const clienteId = solicitante.cliente_id;

  // Cargar datos previos
  const { data: clientePrevio } = await supabase
    .from("clientes")
    .select("nombre_comercio, telefono_whatsapp, logo_url")
    .eq("cliente_id", clienteId)
    .maybeSingle<{ nombre_comercio: string; telefono_whatsapp: string; logo_url: string | null }>();

  const logoNormalizado = logoUrl && logoUrl.trim() !== "" ? logoUrl.trim() : null;

  const { error: errorUpdate } = await supabase
    .from("clientes")
    .update({
      nombre_comercio: validacion.data.nombreComercio.trim(),
      telefono_whatsapp: validacion.data.telefonoWhatsapp,
      logo_url: validacion.data.logoUrl && validacion.data.logoUrl.trim() !== "" ? validacion.data.logoUrl.trim() : null,
    })
    .eq("cliente_id", clienteId);

  if (errorUpdate) {
    return { ok: false, error: "NX-SYS-001" };
  }

  // Registrar auditoría
  registrarDiff({
    clienteId,
    usuarioId: solicitante.usuario_id,
    tablaAfectada: "clientes",
    registroId: clienteId,
    campoModificado: "datos_comerciales",
    valorAnterior: JSON.stringify(clientePrevio),
    valorNuevo: JSON.stringify({
      nombre_comercio: validacion.data.nombreComercio.trim(),
      telefono_whatsapp: validacion.data.telefonoWhatsapp,
      logo_url: validacion.data.logoUrl && validacion.data.logoUrl.trim() !== "" ? validacion.data.logoUrl.trim() : null,
    }),
  });

  return {
    ok: true,
    data: {
      nombreComercio: validacion.data.nombreComercio.trim(),
      telefonoWhatsapp: validacion.data.telefonoWhatsapp,
      logoUrl: validacion.data.logoUrl && validacion.data.logoUrl.trim() !== "" ? validacion.data.logoUrl.trim() : null,
    },
  };
}
