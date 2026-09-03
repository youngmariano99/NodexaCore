"use server";

import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface Categoria {
  categoria_id: string;
  nombre: string;
  cliente_id: string;
}

export async function crearCategoria(nombre: string): Promise<{ exito: boolean; categoria?: Categoria; error?: string }> {
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

    const { data: categoriaCreada, error } = await supabase
      .from("categorias")
      .insert([
        {
          cliente_id: usuario.cliente_id,
          nombre: nombre.trim(),
        },
      ])
      .select("categoria_id, nombre, cliente_id")
      .single();

    if (error) {
      console.error("Error al crear categoría:", error);
      return { exito: false, error: "Ocurrió un error al crear la categoría." };
    }

    // Opcional: Revalidar alguna ruta donde se listen las categorías si fuera necesario
    revalidatePath("/(app)/productos/nuevo", "page");

    return { exito: true, categoria: categoriaCreada };
  } catch (error) {
    console.error("Error inesperado en crearCategoria:", error);
    return { exito: false, error: "Ocurrió un error inesperado al intentar crear la categoría." };
  }
}
