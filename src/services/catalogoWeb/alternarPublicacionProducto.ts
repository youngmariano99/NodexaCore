"use server";

import { z } from "zod";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { verificarPertenenciaTenant } from "@/repositories/base/verificarPertenenciaTenant";
import type { EstadoAlternarPublicacionProducto } from "@/services/catalogoWeb/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

const esquemaAlternarPublicacion = z.object({
  publicado: z.enum(["true", "false"], { message: "El estado de publicación es inválido." }).transform((valor) => valor === "true"),
});

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaProductoParaPublicar {
  nombre: string;
  precio: number;
  imagen_url: string | null;
  publicado: boolean;
  eliminado_en: string | null;
}

/**
 * Publicación/despublicación de un producto en la vidriera pública
 * (docs/ROLES.md §2, fila "productos — publicar/despublicar": `M`
 * **exclusivo de `comerciante`**, a diferencia del alta/edición general que
 * sí permite `empleado`). La política RLS `productos_update_tenant` no
 * distingue por columna qué está modificando un `UPDATE` — un `empleado`
 * técnicamente puede actualizar filas de `productos` (mientras
 * `eliminado_en IS NULL`), así que el chequeo de rol acá NO es defensa en
 * profundidad opcional: es la única barrera real que impide que un
 * `empleado` publique/despublique, igual que el criterio ya documentado
 * para `clientes_finales.saldo_deudor` (docs/SCHEMA.md).
 *
 * Publicar (`publicado: true`) exige dos validaciones que despublicar no
 * necesita:
 * - Paso 2: el módulo `catalogo_web` tiene que estar activo en
 *   `tenant_modules` del tenant (`NX-WEB-001` si no).
 * - Paso 3: el producto tiene que tener `nombre`, `precio` (> 0, un ítem a
 *   $0 no es publicable) e `imagen_url` cargados (`NX-WEB-002` si falta
 *   alguno), sin tocar el flag.
 *
 * La vidriera pública (`/c/[clienteSlug]`) ya filtra
 * `publicado = true AND eliminado_en IS NULL` vía la política RLS
 * `productos_lectura_publica` (docs/SCHEMA.md §18) — no hace falta ningún
 * código adicional acá para que el producto aparezca/desaparezca: el
 * `UPDATE` de este archivo es suficiente (Criterios de Aceptación 3 y 4).
 */
export async function alternarPublicacionProducto(
  productoId: string,
  _estadoPrevio: EstadoAlternarPublicacionProducto,
  formData: FormData,
): Promise<EstadoAlternarPublicacionProducto> {
  const resultado = esquemaAlternarPublicacion.safeParse({
    publicado: formData.get("publicado"),
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

  const clienteId = solicitante.cliente_id;

  const verificacion = await verificarPertenenciaTenant(productoId, clienteId, {
    supabase,
    tabla: "productos",
    usuarioId: solicitante.usuario_id,
  });

  if (!verificacion.perteneceAlTenant) {
    return { error: verificacion.error ?? "NX-SYS-007", exito: false };
  }

  const { data: producto, error: errorProducto } = await supabase
    .from("productos")
    .select("nombre, precio, imagen_url, publicado, eliminado_en")
    .eq("producto_id", productoId)
    .maybeSingle<FilaProductoParaPublicar>();

  if (errorProducto || !producto) {
    return { error: "NX-SYS-001", exito: false };
  }

  if (producto.eliminado_en) {
    return { error: "NX-PRD-006", exito: false };
  }

  const nuevoPublicado = resultado.data.publicado;

  if (nuevoPublicado) {
    const { data: moduloCatalogoWeb } = await supabase
      .from("tenant_modules")
      .select("activo")
      .eq("cliente_id", clienteId)
      .eq("modulo", "catalogo_web")
      .maybeSingle<{ activo: boolean }>();

    if (!moduloCatalogoWeb?.activo) {
      return { error: "NX-WEB-001", exito: false };
    }

    const tieneNombre = producto.nombre.trim().length > 0;
    const tienePrecio = producto.precio > 0;
    const tieneImagen = Boolean(producto.imagen_url?.trim());

    if (!tieneNombre || !tienePrecio || !tieneImagen) {
      return { error: "NX-WEB-002", exito: false };
    }
  }

  const { error: errorActualizacion } = await supabase
    .from("productos")
    .update({ publicado: nuevoPublicado, actualizado_en: new Date().toISOString() })
    .eq("producto_id", productoId);

  if (errorActualizacion) {
    return { error: "NX-SYS-001", exito: false };
  }

  registrarDiff({
    clienteId,
    usuarioId: solicitante.usuario_id,
    tablaAfectada: "productos",
    registroId: productoId,
    campoModificado: "publicado",
    valorAnterior: String(producto.publicado),
    valorNuevo: String(nuevoPublicado),
  });

  return { error: null, exito: true };
}
