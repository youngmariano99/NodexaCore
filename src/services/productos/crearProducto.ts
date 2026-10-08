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
  categoria: z.string({ message: "La categorÃ­a es obligatoria." }).trim().min(1, "La categorÃ­a es obligatoria."),
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
 * Â§2 fila "productos": `C` para comerciante y empleado). El precio invÃ¡lido
 * se distingue del resto de errores de forma Fail-Fast: solo esa falla
 * especÃ­fica mapea a `NX-PRD-003` (docs/ERRORS.md), cualquier otro campo
 * faltante cae en el genÃ©rico `NX-SYS-006` â€” no existe un cÃ³digo de
 * catÃ¡logo para "nombre faltante" y estÃ¡ prohibido inventar uno nuevo.
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

  const sku = formData.get("sku")?.toString() || "";
  const nombre = formData.get("nombre")?.toString() || "";
  const categoria = formData.get("categoria")?.toString() || "";
  const categoriaIdStr = formData.get("categoria_id")?.toString() || "";
  const marcaIdStr = formData.get("marca_id")?.toString() || "";
  const categoriaId = categoriaIdStr !== "" ? categoriaIdStr : null;
  const marcaId = marcaIdStr !== "" ? marcaIdStr : null;

  const precio = parseFloat(formData.get("precio")?.toString() || "0");

  if (!sku || !nombre || precio < 0) {
    return {
      exito: false,
      error: "Faltan campos obligatorios.",
    };
  }

  // Subida de imagen
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
    sku,
    nombre,
    precio,
    categoria,
    categoriaId,
    marcaId,
    imagenUrl,
  });

  if (!productoCreado.ok) {
    return { error: productoCreado.error, exito: false };
  }
  // Procesar e insertar variantes si vienen en el lote
  const rawVariantes = formData.get("variantes");
  const rawInsumosBase = formData.get("insumosBase");
  const rendimientoBase = parseFloat(formData.get("rendimientoBase")?.toString() || "1");

  let insumosBase: Array<{ producto_id: string; cantidad: number }> = [];
  if (rawInsumosBase && typeof rawInsumosBase === "string") {
    try {
      insumosBase = JSON.parse(rawInsumosBase);
    } catch {
      // Ignorar error de parseo
    }
  }

  // Funcion auxiliar para guardar receta
  const guardarReceta = async (productoId: string, insumosExtra: Array<{ producto_id: string; cantidad: number }> = []) => {
    if (insumosBase.length === 0 && insumosExtra.length === 0) return;
    
    const { data: receta, error: errReceta } = await supabase
      .from("recetas")
      .insert({
        cliente_id: clienteId,
        producto_id: productoId,
        rendimiento_lote: rendimientoBase,
        estado_costeo: "actualizado",
      })
      .select("receta_id")
      .single();

    if (errReceta || !receta) {
      console.error("Error guardando receta:", errReceta);
      return;
    }

    const todosLosInsumos = [...insumosBase, ...insumosExtra];
    const mapaInsumos = new Map<string, number>();
    for (const ins of todosLosInsumos) {
      mapaInsumos.set(ins.producto_id, (mapaInsumos.get(ins.producto_id) || 0) + ins.cantidad);
    }

    const payloadInsumos = Array.from(mapaInsumos.entries()).map(([id, cant]) => ({
      receta_id: receta.receta_id,
      insumo_producto_id: id,
      cantidad_utilizada: cant,
    }));

    if (payloadInsumos.length > 0) {
      const errIns = await supabase.from("receta_insumos").insert(payloadInsumos);
      if (errIns.error) console.error("Error guardando insumos de receta:", errIns.error);
    }
  };

  if (rawVariantes && typeof rawVariantes === "string") {
    try {
      const variantes = JSON.parse(rawVariantes) as Array<{
        sku: string;
        stock: number;
        precio: number;
        combinacion: Record<string, string>;
        insumosExtra?: Array<{ producto_id: string; cantidad: number }>;
      }>;

      for (const v of variantes) {
        const sufijoNombre = Object.values(v.combinacion).join(" / ");
        const nombreVariante = sufijoNombre ? `${nombre} - ${sufijoNombre}` : nombre;

        const varianteCreada = await insertarProducto(supabase, {
          clienteId,
          sku: v.sku,
          nombre: nombreVariante,
          precio: v.precio,
          categoria: categoria,
          categoriaId,
          marcaId,
          imagenUrl,
          productoPadreId: productoCreado.data.producto_id,
        });

        if (!varianteCreada.ok) {
          return { error: varianteCreada.error, exito: false };
        }

        if (insumosBase.length > 0 || (v.insumosExtra && v.insumosExtra.length > 0)) {
           await guardarReceta(varianteCreada.data.producto_id, v.insumosExtra || []);
        }
      }
    } catch {
      return { error: "NX-SYS-006", exito: false };
    }
  } else {
    if (insumosBase.length > 0) {
      await guardarReceta(productoCreado.data.producto_id, []);
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

