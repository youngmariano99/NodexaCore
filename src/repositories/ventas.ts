import type { SupabaseClient } from "@supabase/supabase-js";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { verificarPertenenciaTenant } from "@/repositories/base/verificarPertenenciaTenant";
import type { ResultadoRepositorio } from "@/repositories/base/tipos";

export type EstadoVenta = "confirmada" | "devuelta_parcial" | "devuelta_total";

export interface ContextoRepositorioVentas {
  supabase: SupabaseClient;
  clienteIdJwt: string | null;
  usuarioId: string;
}

interface FilaVentaActualizada {
  venta_id: string;
  estado: EstadoVenta;
}

/**
 * Transición de estado de una venta (ej. a `devuelta_parcial`/`devuelta_total`
 * al confirmarse una devolución — docs/SCHEMA.md §7). Guard IDOR/BOLA
 * (docs/ROLES.md §3.8) antes de tocar la base: si la venta no pertenece al
 * tenant del solicitante, corta en NX-SYS-007 sin ejecutar el UPDATE.
 *
 * Registra el diff con `registrarDiff` (src/lib/auditoria/): corre después de
 * confirmar el UPDATE, vía `after()`, sin retrasar ni depender de la
 * respuesta ya armada para el cliente (CLAUDE.md §4 "trazabilidad").
 */
export async function actualizarEstadoVenta(
  ventaId: string,
  nuevoEstado: EstadoVenta,
  contexto: ContextoRepositorioVentas,
): Promise<ResultadoRepositorio<FilaVentaActualizada>> {
  const { supabase, clienteIdJwt, usuarioId } = contexto;

  if (!clienteIdJwt) {
    return { ok: false, error: "NX-SYS-007" };
  }

  const verificacion = await verificarPertenenciaTenant(ventaId, clienteIdJwt, {
    supabase,
    tabla: "ventas",
    usuarioId,
  });

  if (!verificacion.perteneceAlTenant) {
    return { ok: false, error: verificacion.error ?? "NX-SYS-007" };
  }

  const { data: filaAnterior } = await supabase
    .from("ventas")
    .select("estado")
    .eq("venta_id", ventaId)
    .maybeSingle<{ estado: EstadoVenta }>();

  const { data, error } = await supabase
    .from("ventas")
    .update({ estado: nuevoEstado })
    .eq("venta_id", ventaId)
    .select("venta_id, estado")
    .single<FilaVentaActualizada>();

  if (error || !data) {
    return { ok: false, error: "NX-SYS-001" };
  }

  registrarDiff({
    clienteId: clienteIdJwt,
    usuarioId,
    tablaAfectada: "ventas",
    registroId: data.venta_id,
    campoModificado: "estado",
    valorAnterior: filaAnterior?.estado ?? null,
    valorNuevo: data.estado,
  });

  return { ok: true, data };
}

export const TAMANIO_PAGINA_EXPORTACION_VENTAS = 500;
const LIMITE_ITERACIONES_EXPORTACION_VENTAS = 200; // tope defensivo: 200 * 500 = 100.000 filas

export interface FilaVentaExport {
  venta_id: string;
  cliente_final_id: string | null;
  total: number;
  estado: EstadoVenta;
  creado_en: string;
}

export interface FilaVentaItemExport {
  venta_item_id: string;
  venta_id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface FilaVentaItemConVentaEmbebida extends FilaVentaItemExport {
  ventas: { cliente_id: string } | { cliente_id: string }[];
}

/**
 * Página de `ventas` de un tenant para exportación (docs/SITEMAP.md
 * "/api/export/ventas"). Mismo desempate `creado_en DESC, venta_id ASC` ya
 * verificado contra duplicados en `obtenerProductosPaginados`
 * (productosRepository.ts): varias ventas sembradas comparten `creado_en`
 * literal por lote, así que ordenar solo por fecha no garantiza páginas sin
 * solapamiento.
 */
export async function obtenerVentasPaginadas(
  supabase: SupabaseClient,
  clienteId: string,
  pagina: number,
  porPagina: number = TAMANIO_PAGINA_EXPORTACION_VENTAS,
): Promise<ResultadoRepositorio<{ ventas: FilaVentaExport[]; total: number }>> {
  const desde = (pagina - 1) * porPagina;
  const hasta = desde + porPagina - 1;

  const { data, error, count } = await supabase
    .from("ventas")
    .select("venta_id, cliente_final_id, total, estado, creado_en", { count: "exact" })
    .eq("cliente_id", clienteId)
    .is("eliminado_en", null)
    .order("creado_en", { ascending: false })
    .order("venta_id", { ascending: true })
    .range(desde, hasta)
    .returns<FilaVentaExport[]>();

  if (error || !data) {
    return { ok: false, error: "NX-SYS-001" };
  }

  return { ok: true, data: { ventas: data, total: count ?? 0 } };
}

/**
 * Página de `venta_items` de un tenant. La tabla no tiene columna
 * `cliente_id` propia (docs/SCHEMA.md §8), así que el filtro de tenant se
 * aplica sobre el join embebido a `ventas` (`ventas!inner(cliente_id)` +
 * `.eq('ventas.cliente_id', ...)`) en vez de confiar únicamente en la
 * política RLS `venta_items_select_tenant` (que resuelve el aislamiento vía
 * `EXISTS` contra `ventas`) — defensa en profundidad explícita, mismo
 * criterio que el resto del repositorio.
 */
export async function obtenerVentaItemsPaginados(
  supabase: SupabaseClient,
  clienteId: string,
  pagina: number,
  porPagina: number = TAMANIO_PAGINA_EXPORTACION_VENTAS,
): Promise<ResultadoRepositorio<{ items: FilaVentaItemExport[]; total: number }>> {
  const desde = (pagina - 1) * porPagina;
  const hasta = desde + porPagina - 1;

  const { data, error, count } = await supabase
    .from("venta_items")
    .select("venta_item_id, venta_id, producto_id, cantidad, precio_unitario, subtotal, ventas!inner(cliente_id)", {
      count: "exact",
    })
    .eq("ventas.cliente_id", clienteId)
    .order("venta_id", { ascending: true })
    .order("venta_item_id", { ascending: true })
    .range(desde, hasta)
    .returns<FilaVentaItemConVentaEmbebida[]>();

  if (error || !data) {
    return { ok: false, error: "NX-SYS-001" };
  }

  const items = data.map(({ ventas: _ventas, ...item }) => item);

  return { ok: true, data: { items, total: count ?? 0 } };
}

/**
 * Trae todas las `ventas` activas de un tenant paginando internamente
 * (Paso 3, Criterio de Aceptación 3: "volumen alto de ventas históricas...
 * la consulta se pagina internamente"). Nunca un `SELECT` sin límite
 * (CLAUDE.md §4) — mismo patrón que `obtenerTodosLosProductosActivos`
 * (productosRepository.ts).
 */
export async function obtenerTodasLasVentasActivas(
  supabase: SupabaseClient,
  clienteId: string,
): Promise<ResultadoRepositorio<FilaVentaExport[]>> {
  const ventas: FilaVentaExport[] = [];
  let pagina = 1;

  while (pagina <= LIMITE_ITERACIONES_EXPORTACION_VENTAS) {
    const resultado = await obtenerVentasPaginadas(supabase, clienteId, pagina, TAMANIO_PAGINA_EXPORTACION_VENTAS);

    if (!resultado.ok) {
      return resultado;
    }

    ventas.push(...resultado.data.ventas);

    const seAgotoElTotal = ventas.length >= resultado.data.total;
    const ultimaPaginaIncompleta = resultado.data.ventas.length < TAMANIO_PAGINA_EXPORTACION_VENTAS;

    if (seAgotoElTotal || ultimaPaginaIncompleta) {
      break;
    }

    pagina += 1;
  }

  return { ok: true, data: ventas };
}

/** Equivalente de `obtenerTodasLasVentasActivas` para `venta_items`. */
export async function obtenerTodosLosVentaItemsActivos(
  supabase: SupabaseClient,
  clienteId: string,
): Promise<ResultadoRepositorio<FilaVentaItemExport[]>> {
  const items: FilaVentaItemExport[] = [];
  let pagina = 1;

  while (pagina <= LIMITE_ITERACIONES_EXPORTACION_VENTAS) {
    const resultado = await obtenerVentaItemsPaginados(supabase, clienteId, pagina, TAMANIO_PAGINA_EXPORTACION_VENTAS);

    if (!resultado.ok) {
      return resultado;
    }

    items.push(...resultado.data.items);

    const seAgotoElTotal = items.length >= resultado.data.total;
    const ultimaPaginaIncompleta = resultado.data.items.length < TAMANIO_PAGINA_EXPORTACION_VENTAS;

    if (seAgotoElTotal || ultimaPaginaIncompleta) {
      break;
    }

    pagina += 1;
  }

  return { ok: true, data: items };
}
