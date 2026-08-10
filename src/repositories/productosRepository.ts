import type { SupabaseClient } from "@supabase/supabase-js";

import type { ResultadoRepositorio } from "@/repositories/base/tipos";

const CODIGO_UNIQUE_VIOLATION_POSTGRES = "23505";

export interface DatosNuevoProducto {
  clienteId: string;
  sku: string;
  nombre: string;
  precio: number;
  categoria: string;
}

export interface FilaProducto {
  producto_id: string;
  cliente_id: string;
  sku: string;
  nombre: string;
  precio: number;
  categoria: string | null;
}

interface ErrorPostgres {
  code?: string;
}

function esUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as ErrorPostgres).code === CODIGO_UNIQUE_VIOLATION_POSTGRES;
}

/**
 * Conteo de SKUs activos de un tenant (docs/SCHEMA.md §5, índice
 * `idx_productos_cliente_activos`: "soporte al conteo de límite de SKU").
 * Solo cuenta filas no eliminadas lógicamente, sin traer las filas en sí
 * (`head: true`) — nunca un SELECT * sin LIMIT (CLAUDE.md §4 "escalabilidad").
 */
export async function contarProductosActivos(
  supabase: SupabaseClient,
  clienteId: string,
): Promise<ResultadoRepositorio<number>> {
  const { count, error } = await supabase
    .from("productos")
    .select("producto_id", { count: "exact", head: true })
    .eq("cliente_id", clienteId)
    .is("eliminado_en", null);

  if (error || count === null) {
    return { ok: false, error: "NX-SYS-001" };
  }

  return { ok: true, data: count };
}

/**
 * Alta manual de producto (docs/ROLES.md §2, fila "productos — alta/edición/
 * baja": `C` para comerciante y empleado). Corre con el cliente de sesión:
 * `productos_insert_tenant` (WITH CHECK cliente_id = auth_cliente_id()) no
 * distingue rol para el INSERT, a diferencia del UPDATE. El `cliente_id` se
 * fija explícito acá (nunca confiado del DTO del cliente) como defensa en
 * profundidad adicional a la política RLS.
 */
export async function insertarProducto(
  supabase: SupabaseClient,
  datos: DatosNuevoProducto,
): Promise<ResultadoRepositorio<FilaProducto>> {
  const { data, error } = await supabase
    .from("productos")
    .insert({
      cliente_id: datos.clienteId,
      sku: datos.sku,
      nombre: datos.nombre,
      precio: datos.precio,
      categoria: datos.categoria,
    })
    .select("producto_id, cliente_id, sku, nombre, precio, categoria")
    .single<FilaProducto>();

  if (error || !data) {
    if (esUniqueViolation(error)) {
      return { ok: false, error: "NX-PRD-002" };
    }
    return { ok: false, error: "NX-SYS-001" };
  }

  return { ok: true, data };
}
