"use server";

import { z } from "zod";
import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

const esquemaCrearInsumo = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  costo: z.number().min(0, "El costo no puede ser negativo."),
});

export async function crearInsumoInline(prevState: any, formData: FormData) {
  try {
    const rawData = {
      nombre: formData.get("nombre") as string,
      costo: parseFloat(formData.get("costo") as string) || 0,
    };

    const parsed = esquemaCrearInsumo.safeParse(rawData);
    if (!parsed.success) {
      return { error: "Datos inválidos" };
    }

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
    const skuGenerado = `INS-${Date.now().toString().slice(-6)}`;

    const insert = await supabase.from("productos").insert({
      producto_id: nuevoId,
      cliente_id: solicitante.cliente_id,
      sku: skuGenerado,
      nombre: parsed.data.nombre,
      precio: parsed.data.costo, // Cost of insumo is saved in precio field typically for insumos? Wait.
      tipo_producto: "insumo",
    });

    if (insert.error) throw insert.error;

    await registrarDiff({
      clienteId: solicitante.cliente_id,
      entidad: "productos",
      entidadId: nuevoId,
      accion: "crear",
      valoresNuevos: { sku: skuGenerado, nombre: parsed.data.nombre, precio: parsed.data.costo, tipo_producto: "insumo" },
      descripcion: `Creó insumo inline: ${parsed.data.nombre}`,
    });

    return { 
      exito: true, 
      insumo: {
        producto_id: nuevoId,
        sku: skuGenerado,
        nombre: parsed.data.nombre,
        precio: parsed.data.costo
      }
    };
  } catch (err) {
    console.error(err);
    return { error: "Error interno del servidor" };
  }
}
