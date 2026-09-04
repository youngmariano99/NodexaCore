"use server";

import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

export interface Categoria {
  categoria_id: string;
  nombre: string;
  cliente_id: string;
}

export async function obtenerCategorias(): Promise<Categoria[]> {
  try {
    const supabase = await crearClienteSupabaseServidor();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("No autenticado");
    }

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("cliente_id")
      .eq("auth_user_id", user.id)
      .is("eliminado_en", null)
      .single();

    if (!usuario?.cliente_id) {
      throw new Error("No tenés asignado un cliente_id válido.");
    }

    const { data: categorias, error } = await supabase
      .from("categorias")
      .select("categoria_id, nombre, cliente_id")
      .eq("cliente_id", usuario.cliente_id)
      .is("eliminado_en", null)
      .order("nombre", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return categorias || [];
  } catch (error) {
    console.error("Error al obtener categorías:", error);
    return [];
  }
}
