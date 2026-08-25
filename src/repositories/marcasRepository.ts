import type { SupabaseClient } from "@supabase/supabase-js";

import type { ResultadoRepositorio } from "@/repositories/base/tipos";

export interface DatosNuevaMarca {
  clienteId: string;
  nombre: string;
}

export interface FilaMarca {
  marca_id: string;
  cliente_id: string;
  nombre: string;
  creado_en: string;
  eliminado_en: string | null;
}

/**
 * Cuenta la cantidad de marcas activas (no eliminadas lógicamente) de un comercio.
 */
export async function contarMarcasActivas(
  supabase: SupabaseClient,
  clienteId: string,
): Promise<ResultadoRepositorio<number>> {
  const { count, error } = await supabase
    .from("marcas")
    .select("marca_id", { count: "exact", head: true })
    .eq("cliente_id", clienteId)
    .is("eliminado_en", null);

  if (error || count === null) {
    return { ok: false, error: "NX-SYS-001" };
  }

  return { ok: true, data: count };
}

/**
 * Inserta una nueva marca en el catálogo.
 */
export async function insertarMarca(
  supabase: SupabaseClient,
  datos: DatosNuevaMarca,
): Promise<ResultadoRepositorio<FilaMarca>> {
  const { data, error } = await supabase
    .from("marcas")
    .insert({
      cliente_id: datos.clienteId,
      nombre: datos.nombre,
    })
    .select("marca_id, cliente_id, nombre, creado_en, eliminado_en")
    .single<FilaMarca>();

  if (error || !data) {
    return { ok: false, error: "NX-SYS-001" };
  }

  return { ok: true, data };
}
