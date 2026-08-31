"use server";

import { z } from "zod";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { insertarClienteFinal } from "@/repositories/clientesFinales";
import type { EstadoCrearClienteFinal } from "@/services/fiados/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

import { zTelefonoOpcional } from "@/lib/validaciones/transformadores";

const esquemaCrearClienteFinal = z.object({
  nombre: z.string({ message: "El nombre es obligatorio." }).trim().min(1, "El nombre es obligatorio."),
  telefono: zTelefonoOpcional(),
});

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaModuloFiados {
  activo: boolean;
}

/**
 * Alta de cliente final (docs/SITEMAP.md "/clientes", módulo Fiados;
 * docs/ROLES.md §2 fila "clientes_finales (fiados)": `C` para comerciante y
 * empleado). `telefono` es opcional (docs/SCHEMA.md §9): un string vacío del
 * formulario se normaliza a `null` en el propio esquema Zod para no guardar
 * cadenas vacías en una columna que se usa como parte de la unicidad de
 * contacto (`idx_clientesfinales_telefono_unico`).
 *
 * El chequeo de módulo activo replica el mismo gate ya usado por
 * `/api/carga-ia` para `carga_ia`: sin el módulo `fiados` contratado, se
 * corta en `NX-FIA-001` antes de tocar `clientes_finales`.
 */
export async function crearClienteFinal(
  _estadoPrevio: EstadoCrearClienteFinal,
  formData: FormData,
): Promise<EstadoCrearClienteFinal> {
  const resultado = esquemaCrearClienteFinal.safeParse({
    nombre: formData.get("nombre"),
    telefono: formData.get("telefono"),
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

  if ((solicitante.rol !== "comerciante" && solicitante.rol !== "empleado") || !solicitante.cliente_id) {
    return { error: "NX-SYS-003", exito: false };
  }

  const clienteId = solicitante.cliente_id;

  const { data: moduloFiados } = await supabase
    .from("tenant_modules")
    .select("activo")
    .eq("cliente_id", clienteId)
    .eq("modulo", "fiados")
    .maybeSingle<FilaModuloFiados>();

  if (!moduloFiados?.activo) {
    return { error: "NX-FIA-001", exito: false };
  }

  const clienteFinalCreado = await insertarClienteFinal(supabase, {
    clienteId,
    nombre: resultado.data.nombre,
    telefono: resultado.data.telefono,
  });

  if (!clienteFinalCreado.ok) {
    return { error: clienteFinalCreado.error, exito: false };
  }

  registrarDiff({
    clienteId,
    usuarioId: solicitante.usuario_id,
    tablaAfectada: "clientes_finales",
    registroId: clienteFinalCreado.data.cliente_final_id,
    campoModificado: "alta",
    valorAnterior: null,
    valorNuevo: JSON.stringify({
      nombre: resultado.data.nombre,
      telefono: resultado.data.telefono,
      saldo_deudor: 0,
    }),
  });

  return { error: null, exito: true };
}
