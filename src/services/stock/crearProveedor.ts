"use server";

import { z } from "zod";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { contarProveedoresActivos, insertarProveedor } from "@/repositories/proveedoresRepository";
import type { EstadoCrearProveedor } from "@/services/stock/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

const esquemaCrearProveedor = z.object({
  nombre: z.string().min(1, { message: "El nombre es obligatorio." }),
  contacto: z.string().min(1, { message: "El contacto es obligatorio." }),
  diasDemora: z.number().int().min(0, { message: "Los días de demora deben ser un entero no negativo." }),
});

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
  cliente_id: string | null;
}

/**
 * Server Action para dar de alta un nuevo proveedor con límite máximo de 20 proveedores activos.
 */
export async function crearProveedor(
  _estadoPrevio: EstadoCrearProveedor,
  formData: FormData,
): Promise<EstadoCrearProveedor> {
  const rawDias = formData.get("diasDemora");

  const resultado = esquemaCrearProveedor.safeParse({
    nombre: formData.get("nombre"),
    contacto: formData.get("contacto"),
    diasDemora: rawDias ? Number(rawDias) : undefined,
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

  // Validar límite máximo de 20 proveedores activos
  const resultadoConteo = await contarProveedoresActivos(supabase, clienteId);
  if (!resultadoConteo.ok) {
    return { error: resultadoConteo.error, exito: false };
  }

  if (resultadoConteo.data >= 20) {
    return { error: "NX-PROV-001", exito: false };
  }

  // Insertar proveedor
  const resultadoInsercion = await insertarProveedor(supabase, {
    clienteId,
    nombre: resultado.data.nombre,
    contacto: resultado.data.contacto,
    diasDemora: resultado.data.diasDemora,
  });

  if (!resultadoInsercion.ok) {
    return { error: resultadoInsercion.error, exito: false };
  }

  const nuevoProveedor = resultadoInsercion.data;

  // Registrar auditoría asíncronamente
  registrarDiff({
    clienteId,
    usuarioId: solicitante.usuario_id,
    tablaAfectada: "proveedores",
    registroId: nuevoProveedor.proveedor_id,
    campoModificado: "alta",
    valorAnterior: null,
    valorNuevo: JSON.stringify(nuevoProveedor),
  }).catch(console.error);

  return { error: null, exito: true };
}
