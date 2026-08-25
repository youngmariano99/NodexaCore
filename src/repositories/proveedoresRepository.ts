import type { SupabaseClient } from "@supabase/supabase-js";

import type { ResultadoRepositorio } from "@/repositories/base/tipos";

export interface DatosNuevoProveedor {
  clienteId: string;
  nombre: string;
  contacto: string;
  diasDemora: number;
}

export interface FilaProveedor {
  proveedor_id: string;
  cliente_id: string;
  nombre: string;
  contacto: string;
  dias_demora: number;
  creado_en: string;
  eliminado_en: string | null;
}

/**
 * Cuenta la cantidad de proveedores activos (no eliminados lógicamente) de un comercio.
 */
export async function contarProveedoresActivos(
  supabase: SupabaseClient,
  clienteId: string,
): Promise<ResultadoRepositorio<number>> {
  const { count, error } = await supabase
    .from("proveedores")
    .select("proveedor_id", { count: "exact", head: true })
    .eq("cliente_id", clienteId)
    .is("eliminado_en", null);

  if (error || count === null) {
    return { ok: false, error: "NX-SYS-001" };
  }

  return { ok: true, data: count };
}

/**
 * Inserta un nuevo proveedor en el catálogo.
 */
export async function insertarProveedor(
  supabase: SupabaseClient,
  datos: DatosNuevoProveedor,
): Promise<ResultadoRepositorio<FilaProveedor>> {
  const { data, error } = await supabase
    .from("proveedores")
    .insert({
      cliente_id: datos.clienteId,
      nombre: datos.nombre,
      contacto: datos.contacto,
      dias_demora: datos.diasDemora,
    })
    .select("proveedor_id, cliente_id, nombre, contacto, dias_demora, creado_en, eliminado_en")
    .single<FilaProveedor>();

  if (error || !data) {
    return { ok: false, error: "NX-SYS-001" };
  }

  return { ok: true, data };
}
