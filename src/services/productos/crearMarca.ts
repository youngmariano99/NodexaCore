"use server";

import { z } from "zod";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { contarMarcasActivas, insertarMarca } from "@/repositories/marcasRepository";
import type { EstadoCrearMarca } from "@/services/productos/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

const limiteMarcasBase = 50;

const esquemaCrearMarca = z.object({
  nombre: z.string({ message: "El nombre es obligatorio." }).trim().min(1, "El nombre es obligatorio."),
});

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
  cliente_id: string | null;
}

/**
 * Alta manual de marca.
 * Valida que el comercio no supere el límite de 50 marcas activas.
 */
export async function crearMarca(
  _estadoPrevio: EstadoCrearMarca,
  formData: FormData,
): Promise<EstadoCrearMarca> {
  const resultado = esquemaCrearMarca.safeParse({
    nombre: formData.get("nombre"),
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

  const conteoActivos = await contarMarcasActivas(supabase, clienteId);

  if (!conteoActivos.ok) {
    return { error: conteoActivos.error, exito: false };
  }

  if (conteoActivos.data >= limiteMarcasBase) {
    return { error: "NX-BRD-001", exito: false };
  }

  const marcaCreada = await insertarMarca(supabase, {
    clienteId,
    nombre: resultado.data.nombre,
  });

  if (!marcaCreada.ok) {
    return { error: marcaCreada.error, exito: false };
  }

  registrarDiff({
    clienteId,
    usuarioId: solicitante.usuario_id,
    tablaAfectada: "marcas",
    registroId: marcaCreada.data.marca_id,
    campoModificado: "alta",
    valorAnterior: null,
    valorNuevo: JSON.stringify({
      nombre: resultado.data.nombre,
    }),
  });

  return { error: null, exito: true };
}
