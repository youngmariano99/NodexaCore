"use server";

import { z } from "zod";
import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

const insumoEsquema = z.object({
  producto_id: z.string().uuid(),
  cantidad: z.number().min(0.001),
});

const esquemaCrearPreElaborado = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  rendimiento: z.number().min(0.01),
  costoUnitarioCalculado: z.number().min(0),
  insumos: z.array(insumoEsquema).min(1, "Debe tener al menos 1 ingrediente"),
});

export async function crearInsumoPreElaboradoInline(dataRaw: unknown) {
  try {
    const parsed = esquemaCrearPreElaborado.safeParse(dataRaw);
    if (!parsed.success) {
      return { error: "Datos inválidos" };
    }
    const { nombre, rendimiento, costoUnitarioCalculado, insumos } = parsed.data;

    const supabase = await crearClienteSupabaseServidor();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autorizado" };

    const { data: solicitante } = await supabase
      .from("usuarios")
      .select("cliente_id")
      .eq("auth_user_id", user.id)
      .is("eliminado_en", null)
      .single();

    if (!solicitante?.cliente_id) return { error: "No autorizado" };

    const nuevoId = crypto.randomUUID();
    const skuGenerado = `PRE-${Date.now().toString().slice(-6)}`;

    // 1. Crear el Producto tipo Insumo
    const insert = await supabase.from("productos").insert({
      producto_id: nuevoId,
      cliente_id: solicitante.cliente_id,
      sku: skuGenerado,
      nombre,
      precio: costoUnitarioCalculado, // Costo final calculado que se usar como precio del insumo
      tipo_producto: "insumo",
    });

    if (insert.error) throw insert.error;

    // 2. Crear su Receta (Sub-receta)
    const { data: receta, error: errReceta } = await supabase
      .from("recetas")
      .insert({
        cliente_id: solicitante.cliente_id,
        producto_id: nuevoId,
        rendimiento_lote: rendimiento,
        estado_costeo: "actualizado",
      })
      .select("receta_id")
      .single();

    if (!errReceta && receta) {
      // 3. Crear los Insumos de la Receta
      const payloadInsumos = insumos.map((ins) => ({
        receta_id: receta.receta_id,
        insumo_producto_id: ins.producto_id,
        cantidad_utilizada: ins.cantidad,
      }));

      await supabase.from("receta_insumos").insert(payloadInsumos);
    }

    await registrarDiff({
      clienteId: solicitante.cliente_id,
      usuarioId: user.id,
      tablaAfectada: "productos",
      registroId: nuevoId,
      campoModificado: "alta_preelaborado",
      valorNuevo: JSON.stringify({ sku: skuGenerado, nombre, precio: costoUnitarioCalculado })
    });

    return { 
      exito: true, 
      insumo: {
        producto_id: nuevoId,
        sku: skuGenerado,
        nombre,
        precio: costoUnitarioCalculado
      }
    };
  } catch (err) {
    console.error(err);
    return { error: "Error interno del servidor" };
  }
}
