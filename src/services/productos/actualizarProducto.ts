"use server";

import { z } from "zod";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { verificarPertenenciaTenant } from "@/repositories/base/verificarPertenenciaTenant";
import type { EstadoActualizarProducto } from "@/services/productos/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

const esquemaActualizarProducto = z
  .object({
    nombre: z.string().trim().min(1, "El nombre es obligatorio.").optional(),
    descripcion: z.string().trim().min(1, "La descripción no puede quedar vacía.").optional(),
    categoria: z.string().trim().min(1, "La categoría es obligatoria.").optional(),
    precio: z.coerce.number().min(0, "El precio no puede ser negativo.").optional(),
  })
  .refine((datos) => Object.values(datos).some((valor) => valor !== undefined), {
    message: "Tenés que modificar al menos un campo.",
  });

type CamposEditables = z.infer<typeof esquemaActualizarProducto>;

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaProductoValores {
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  precio: number;
}

interface FilaProductoActualizado extends FilaProductoValores {
  producto_id: string;
  actualizado_en: string;
}

function campoOpcional(formData: FormData, clave: string): string | undefined {
  const valor = formData.get(clave);
  return typeof valor === "string" && valor.length > 0 ? valor : undefined;
}

/**
 * Edición de producto existente (docs/ROLES.md §2, fila "productos —
 * alta/edición/baja": `M` para comerciante y empleado). Guard IDOR/BOLA
 * (docs/ROLES.md §3.8) vía `verificarPertenenciaTenant` antes de tocar la
 * base: si el producto es de otro tenant, corta en NX-SYS-007 sin aplicar
 * cambios. `actualizado_en` se fija explícito en el UPDATE porque
 * docs/SCHEMA.md §5 solo define `DEFAULT now()` (aplica al INSERT, no se
 * refresca solo en un UPDATE de Postgres). Se registra un diff por cada
 * campo efectivamente modificado con `registrarDiff` (encola vía `after()`,
 * no retrasa la respuesta ya armada para el cliente).
 */
export async function actualizarProducto(
  productoId: string,
  _estadoPrevio: EstadoActualizarProducto,
  formData: FormData,
): Promise<EstadoActualizarProducto> {
  const resultado = esquemaActualizarProducto.safeParse({
    nombre: campoOpcional(formData, "nombre"),
    descripcion: campoOpcional(formData, "descripcion"),
    categoria: campoOpcional(formData, "categoria"),
    precio: campoOpcional(formData, "precio"),
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

  const verificacion = await verificarPertenenciaTenant(productoId, clienteId, {
    supabase,
    tabla: "productos",
    usuarioId: solicitante.usuario_id,
  });

  if (!verificacion.perteneceAlTenant) {
    return { error: verificacion.error ?? "NX-SYS-007", exito: false };
  }

  const camposModificados = (Object.keys(resultado.data) as Array<keyof CamposEditables>).filter(
    (campo) => resultado.data[campo] !== undefined,
  );

  const { data: filaAnterior } = await supabase
    .from("productos")
    .select("nombre, descripcion, categoria, precio")
    .eq("producto_id", productoId)
    .maybeSingle<FilaProductoValores>();

  const cambios: Partial<FilaProductoValores> = {};
  camposModificados.forEach((campo) => {
    cambios[campo] = resultado.data[campo] as never;
  });

  const { data: productoActualizado, error: errorActualizacion } = await supabase
    .from("productos")
    .update({ ...cambios, actualizado_en: new Date().toISOString() })
    .eq("producto_id", productoId)
    .select("producto_id, nombre, descripcion, categoria, precio, actualizado_en")
    .single<FilaProductoActualizado>();

  if (errorActualizacion || !productoActualizado) {
    return { error: "NX-SYS-001", exito: false };
  }

  camposModificados.forEach((campo) => {
    registrarDiff({
      clienteId,
      usuarioId: solicitante.usuario_id,
      tablaAfectada: "productos",
      registroId: productoActualizado.producto_id,
      campoModificado: campo,
      valorAnterior: filaAnterior?.[campo] != null ? String(filaAnterior[campo]) : null,
      valorNuevo: productoActualizado[campo] != null ? String(productoActualizado[campo]) : null,
    });
  });

  return { error: null, exito: true };
}
