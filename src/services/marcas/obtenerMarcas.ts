"use server";

import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

export interface Marca {
  marca_id: string;
  nombre: string;
  cliente_id: string;
}

export async function obtenerMarcas(): Promise<Marca[]> {
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

    const { data: marcas, error } = await supabase
      .from("marcas")
      .select("marca_id, nombre, cliente_id")
      .eq("cliente_id", usuario.cliente_id)
      .is("eliminado_en", null)
      .order("nombre", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return marcas || [];
  } catch (error) {
    console.error("Error al obtener marcas:", error);
    return [];
  }
}
