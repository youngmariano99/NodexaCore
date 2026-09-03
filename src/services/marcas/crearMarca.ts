"use server";

import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface Marca {
  marca_id: string;
  nombre: string;
  cliente_id: string;
}

export async function crearMarca(nombre: string): Promise<{ exito: boolean; marca?: Marca; error?: string }> {
  try {
    const supabase = await crearClienteSupabaseServidor();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { exito: false, error: "No autenticado" };
    }

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("cliente_id")
      .eq("auth_user_id", user.id)
      .is("eliminado_en", null)
      .single();

    if (!usuario?.cliente_id) {
      return { exito: false, error: "No tenés asignado un cliente_id válido." };
    }

    const { data: marcaCreada, error } = await supabase
      .from("marcas")
      .insert([
        {
          cliente_id: usuario.cliente_id,
          nombre: nombre.trim(),
        },
      ])
      .select("marca_id, nombre, cliente_id")
      .single();

    if (error) {
      console.error("Error al crear marca:", error);
      return { exito: false, error: "Ocurrió un error al crear la marca." };
    }

    revalidatePath("/(app)/productos/nuevo", "page");

    return { exito: true, marca: marcaCreada };
  } catch (error) {
    console.error("Error inesperado en crearMarca:", error);
    return { exito: false, error: "Ocurrió un error inesperado al intentar crear la marca." };
  }
}
