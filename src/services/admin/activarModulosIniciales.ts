"use server";

import { z } from "zod";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { ResultadoRepositorio } from "@/repositories/base/tipos";
import { MODULOS_NODEXA, type ModuloNodexa } from "@/services/admin/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

const esquemaActivarModulos = z.object({
  clienteId: z.string().uuid("El cliente_id debe ser un UUID válido."),
  modulos: z.array(z.enum(MODULOS_NODEXA as [ModuloNodexa, ...ModuloNodexa[]])).min(1, "Indicá al menos un módulo a activar."),
});

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
}

interface FilaTenantModuleActivado {
  modulo: ModuloNodexa;
}

/**
 * Activación de módulos contratados en el onboarding (docs/ROLES.md §2, fila
 * "tenant_modules": C·L·M exclusivo de admin_nodexa). A diferencia de
 * `clientes`, `tenant_modules` sí tiene política RLS de INSERT
 * (`tenant_modules_insert_admin`, WITH CHECK es_admin_nodexa()) — el insert
 * corre con el cliente de sesión, no con service_role.
 *
 * Usa `upsert(..., { ignoreDuplicates: true })` (INSERT ... ON CONFLICT DO
 * NOTHING sobre `uq_tenant_modules_cliente_modulo`) en vez de un INSERT simple:
 * reactivar un módulo ya contratado no debe romper la operación ni pisar
 * `activado_en`/`activo` de una fila que el comerciante pudo haber
 * desactivado manualmente después del alta.
 *
 * No hay ninguna lectura de Core (productos/ventas/mostrador) condicionada a
 * `tenant_modules` en este repositorio: el desacoplamiento del Pilar de
 * Modularidad se sostiene por ausencia de dependencia, no por un chequeo acá.
 */
export async function activarModulosIniciales(
  clienteId: string,
  modulos: ModuloNodexa[],
): Promise<ResultadoRepositorio<{ modulosActivados: ModuloNodexa[] }>> {
  const resultado = esquemaActivarModulos.safeParse({ clienteId, modulos });

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

  const modulosUnicos = [...new Set(resultado.data.modulos)];

  const { data: filasActivadas, error: errorInsercion } = await supabase
    .from("tenant_modules")
    .upsert(
      modulosUnicos.map((modulo) => ({ cliente_id: resultado.data.clienteId, modulo, activo: true })),
      { onConflict: "cliente_id,modulo", ignoreDuplicates: true },
    )
    .select("modulo")
    .returns<FilaTenantModuleActivado[]>();

  if (errorInsercion) {
    return { ok: false, error: "NX-SYS-001" };
  }

  const modulosActivados = (filasActivadas ?? []).map((fila) => fila.modulo);

  registrarDiff({
    clienteId: resultado.data.clienteId,
    usuarioId: solicitante.usuario_id,
    tablaAfectada: "tenant_modules",
    registroId: resultado.data.clienteId,
    campoModificado: "activacion_inicial",
    valorAnterior: null,
    valorNuevo: JSON.stringify({ modulos: modulosUnicos }),
  });

  return { ok: true, data: { modulosActivados } };
}
