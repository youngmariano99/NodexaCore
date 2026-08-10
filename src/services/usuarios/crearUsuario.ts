"use server";

import { z } from "zod";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseAdmin, crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { RolUsuario } from "@/services/autenticacion/tipos";
import type { EstadoCrearUsuario } from "@/services/usuarios/tipos";

const esquemaCrearUsuario = z.object({
  nombre: z.string({ message: "El nombre es obligatorio." }).trim().min(1, "El nombre es obligatorio."),
  email: z.string({ message: "El email es obligatorio." }).trim().email("Ingresá un email válido."),
  rol: z.enum(["comerciante", "empleado"], { message: "El rol debe ser comerciante o empleado." }),
});

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaUsuarioCreado {
  usuario_id: string;
}

/**
 * Alta de usuarios del propio tenant (docs/ROLES.md §2, fila "usuarios"):
 * exclusiva de `comerciante`. La política RLS `usuarios_insert_comerciante`
 * (supabase/migrations/20260805214353_init_enums_y_tablas_core.sql) es la
 * autoridad final sobre el INSERT; este chequeo es defensa en profundidad
 * (docs/ROLES.md §3.8) para devolver un error de negocio claro en vez de un
 * fallo crudo de Postgres.
 */
export async function crearUsuario(
  _estadoPrevio: EstadoCrearUsuario,
  formData: FormData,
): Promise<EstadoCrearUsuario> {
  const resultado = esquemaCrearUsuario.safeParse({
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    rol: formData.get("rol"),
  });

  if (!resultado.success) {
    return { error: "NX-SYS-006", exito: false };
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

  const clienteIdSolicitante = solicitante.cliente_id;
  const supabaseAdmin = crearClienteSupabaseAdmin();

  // inviteUserByEmail (no createUser + password): el usuario nuevo define su
  // propia contraseña vía el link que le llega por mail — nunca se genera ni
  // se transmite una contraseña temporal en texto plano.
  const { data: altaAuth, error: errorAltaAuth } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    resultado.data.email,
    { data: { nombre: resultado.data.nombre } },
  );

  if (errorAltaAuth || !altaAuth.user) {
    return { error: "NX-SYS-001", exito: false };
  }

  const { data: usuarioCreado, error: errorInsercion } = await supabase
    .from("usuarios")
    .insert({
      auth_user_id: altaAuth.user.id,
      cliente_id: clienteIdSolicitante,
      rol: resultado.data.rol,
      nombre: resultado.data.nombre,
      email: resultado.data.email,
    })
    .select("usuario_id")
    .single<FilaUsuarioCreado>();

  if (errorInsercion || !usuarioCreado) {
    // Evita dejar un usuario huérfano en Auth sin fila correspondiente en `usuarios`.
    await supabaseAdmin.auth.admin.deleteUser(altaAuth.user.id);
    return { error: "NX-SYS-001", exito: false };
  }

  registrarDiff({
    clienteId: clienteIdSolicitante,
    usuarioId: solicitante.usuario_id,
    tablaAfectada: "usuarios",
    registroId: usuarioCreado.usuario_id,
    campoModificado: "alta",
    valorAnterior: null,
    valorNuevo: JSON.stringify({
      nombre: resultado.data.nombre,
      email: resultado.data.email,
      rol: resultado.data.rol,
    }),
  });

  return { error: null, exito: true };
}
