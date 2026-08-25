import type { SupabaseClient } from "@supabase/supabase-js";

import type { ResultadoRepositorio } from "@/repositories/base/tipos";

export interface DatosNuevaCategoria {
  clienteId: string;
  nombre: string;
}

export interface FilaCategoria {
  categoria_id: string;
  cliente_id: string;
  nombre: string;
  creado_en: string;
  eliminado_en: string | null;
}

/**
 * Cuenta la cantidad de categorías activas (no eliminadas lógicamente) de un comercio.
 */
export async function contarCategoriasActivas(
  supabase: SupabaseClient,
  clienteId: string,
): Promise<ResultadoRepositorio<number>> {
  const { count, error } = await supabase
    .from("categorias")
    .select("categoria_id", { count: "exact", head: true })
    .eq("cliente_id", clienteId)
    .is("eliminado_en", null);

  if (error || count === null) {
    return { ok: false, error: "NX-SYS-001" };
  }

  return { ok: true, data: count };
}

/**
 * Inserta una nueva categoría en el catálogo.
 */
export async function insertarCategoria(
  supabase: SupabaseClient,
  datos: DatosNuevaCategoria,
): Promise<ResultadoRepositorio<FilaCategoria>> {
  const { data, error } = await supabase
    .from("categorias")
    .insert({
      cliente_id: datos.clienteId,
      nombre: datos.nombre,
    })
    .select("categoria_id, cliente_id, nombre, creado_en, eliminado_en")
    .single<FilaCategoria>();

  if (error || !data) {
    return { ok: false, error: "NX-SYS-001" };
  }

  return { ok: true, data };
}
