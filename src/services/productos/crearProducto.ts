"use server";

import { z } from "zod";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { contarProductosActivos, insertarProducto } from "@/repositories/productosRepository";
import type { EstadoCrearProducto } from "@/services/productos/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";
import { comprimirImagenProducto } from "@/services/imagenes/comprimirImagen";

import { zMonedaNoNegativa } from "@/lib/validaciones/transformadores";

const esquemaCrearProducto = z.object({
  sku: z.string({ message: "El SKU es obligatorio." }).trim().min(1, "El SKU es obligatorio."),
  nombre: z.string({ message: "El nombre es obligatorio." }).trim().min(1, "El nombre es obligatorio."),
  precio: zMonedaNoNegativa("El precio es obligatorio.", "El precio no puede ser negativo."),
  categoria: z.string({ message: "La categoría es obligatoria." }).trim().min(1, "La categoría es obligatoria."),
  imagen: z.instanceof(File).optional(),
});

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaCliente {
  limite_sku: number;
}

/**
 * Alta manual de producto (docs/SITEMAP.md "/productos/nuevo"; docs/ROLES.md
 * §2 fila "productos": `C` para comerciante y empleado). El precio inválido
 * se distingue del resto de errores de forma Fail-Fast: solo esa falla
 * específica mapea a `NX-PRD-003` (docs/ERRORS.md), cualquier otro campo
 * faltante cae en el genérico `NX-SYS-006` — no existe un código de
 * catálogo para "nombre faltante" y está prohibido inventar uno nuevo.
 */
export async function crearProducto(
  _estadoPrevio: EstadoCrearProducto,
  formData: FormData,
): Promise<EstadoCrearProducto> {
  const archivoImagen = formData.get("imagen");
  const resultado = esquemaCrearProducto.safeParse({
    sku: formData.get("sku"),
    nombre: formData.get("nombre"),
    precio: formData.get("precio"),
    categoria: formData.get("categoria"),
    imagen: archivoImagen instanceof File && archivoImagen.size > 0 ? archivoImagen : undefined,
  });

  if (!resultado.success) {
    const fallaPrecio = resultado.error.issues.some((issue) => issue.path[0] === "precio");
    return { error: fallaPrecio ? "NX-PRD-003" : "NX-SYS-006", exito: false };
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

  const { data: cliente, error: errorCliente } = await supabase
    .from("clientes")
    .select("limite_sku")
    .eq("cliente_id", clienteId)
    .single<FilaCliente>();

  if (errorCliente || !cliente) {
    return { error: "NX-SYS-001", exito: false };
  }

  const conteoActivos = await contarProductosActivos(supabase, clienteId);

  if (!conteoActivos.ok) {
    return { error: conteoActivos.error, exito: false };
  }

  if (conteoActivos.data >= cliente.limite_sku) {
    return { error: "NX-PRD-001", exito: false };
  }

  let imagenUrl: string | null = null;
  if (resultado.data.imagen) {
    const bytes = await resultado.data.imagen.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const resultadoImagen = await comprimirImagenProducto(buffer);
    if (!resultadoImagen.ok) {
      return { error: "NX-PRD-005", exito: false };
    }
    imagenUrl = resultadoImagen.data.url;
  }

  const productoCreado = await insertarProducto(supabase, {
    clienteId,
    sku: resultado.data.sku,
    nombre: resultado.data.nombre,
    precio: resultado.data.precio,
    categoria: resultado.data.categoria,
    imagenUrl,
  });

  if (!productoCreado.ok) {
    return { error: productoCreado.error, exito: false };
  }

  // Procesar e insertar variantes si vienen en el lote
  const rawVariantes = formData.get("variantes");
  if (rawVariantes && typeof rawVariantes === "string") {
    try {
      const variantes = JSON.parse(rawVariantes) as Array<{
        sku: string;
        stock: number;
        precio: number;
        combinacion: Record<string, string>;
      }>;

      for (const v of variantes) {
        const sufijoNombre = Object.values(v.combinacion).join(" / ");
        const nombreVariante = sufijoNombre ? `${resultado.data.nombre} - ${sufijoNombre}` : resultado.data.nombre;

        const varianteCreada = await insertarProducto(supabase, {
          clienteId,
          sku: v.sku,
          nombre: nombreVariante,
          precio: v.precio,
          categoria: resultado.data.categoria,
          imagenUrl,
          productoPadreId: productoCreado.data.producto_id,
        });

        if (!varianteCreada.ok) {
          return { error: varianteCreada.error, exito: false };
        }
      }
    } catch {
      return { error: "NX-SYS-006", exito: false };
    }
  }

  registrarDiff({
    clienteId,
    usuarioId: solicitante.usuario_id,
    tablaAfectada: "productos",
    registroId: productoCreado.data.producto_id,
    campoModificado: "alta",
    valorAnterior: null,
    valorNuevo: JSON.stringify({
      sku: resultado.data.sku,
      nombre: resultado.data.nombre,
      precio: resultado.data.precio,
      categoria: resultado.data.categoria,
      imagen_url: imagenUrl,
    }),
  });

  return { error: null, exito: true };
}
