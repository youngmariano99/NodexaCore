"use server";

import { z } from "zod";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { ResultadoRepositorio } from "@/repositories/base/tipos";
import { MODULOS_NODEXA, type ModuloNodexa } from "@/services/admin/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

const esquemaActualizarModulo = z.object({
  clienteId: z.string().uuid("El cliente_id debe ser un UUID válido."),
  modulo: z.enum(MODULOS_NODEXA as [ModuloNodexa, ...ModuloNodexa[]]),
  activo: z.boolean(),
});

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
}

export async function actualizarModuloCliente(
  clienteId: string,
  modulo: ModuloNodexa,
  activo: z.infer<typeof esquemaActualizarModulo>["activo"]
): Promise<ResultadoRepositorio<{ modulo: ModuloNodexa; activo: boolean }>> {
  const validacion = esquemaActualizarModulo.safeParse({ clienteId, modulo, activo });
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
    .select("usuario_id, rol")
    .eq("auth_user_id", usuarioAutenticado.id)
    .is("eliminado_en", null)
    .single<FilaUsuarioSolicitante>();

  if (errorSolicitante || !solicitante) {
    return { ok: false, error: "NX-SYS-001" };
  }

  // Solo admin_nodexa puede activar/desactivar módulos para el cliente
  if (solicitante.rol !== "admin_nodexa") {
    return { ok: false, error: "NX-SYS-003" };
  }

  const { data: moduloPrevio } = await supabase
    .from("tenant_modules")
    .select("activo")
    .eq("cliente_id", clienteId)
    .eq("modulo", modulo)
    .maybeSingle<{ activo: boolean }>();

  const { error: errorUpsert } = await supabase
    .from("tenant_modules")
    .upsert(
      {
        cliente_id: clienteId,
        modulo,
        activo,
        desactivado_en: activo ? null : new Date().toISOString(),
      },
      { onConflict: "cliente_id,modulo" }
    );

  if (errorUpsert) {
    return { ok: false, error: "NX-SYS-001" };
  }

  registrarDiff({
    clienteId,
    usuarioId: solicitante.usuario_id,
    tablaAfectada: "tenant_modules",
    registroId: clienteId,
    campoModificado: modulo,
    valorAnterior: moduloPrevio ? String(moduloPrevio.activo) : "no_contratado",
    valorNuevo: String(activo),
  });

  return { ok: true, data: { modulo, activo } };
}
