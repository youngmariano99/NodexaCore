"use server";

import { z } from "zod";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { ResultadoRepositorio } from "@/repositories/base/tipos";
import { MODULOS_NODEXA, type ModuloNodexa } from "@/services/admin/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

const esquemaSolicitarModulo = z.object({
  modulo: z.enum(MODULOS_NODEXA as [ModuloNodexa, ...ModuloNodexa[]]),
});

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
  cliente_id: string | null;
}

export async function solicitarModulo(
  modulo: ModuloNodexa
): Promise<ResultadoRepositorio<{ modulo: ModuloNodexa }>> {
  const validacion = esquemaSolicitarModulo.safeParse({ modulo });
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

  if (solicitante.rol !== "comerciante" || !solicitante.cliente_id) {
    return { ok: false, error: "NX-SYS-003" };
  }

  // Registrar la solicitud en la tabla de auditoría
  registrarDiff({
    clienteId: solicitante.cliente_id,
    usuarioId: solicitante.usuario_id,
    tablaAfectada: "tenant_modules",
    registroId: solicitante.cliente_id,
    campoModificado: "solicitud_activacion",
    valorAnterior: "no_contratado",
    valorNuevo: modulo,
  });

  return { ok: true, data: { modulo } };
}
