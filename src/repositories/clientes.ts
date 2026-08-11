import type { SupabaseClient } from "@supabase/supabase-js";

import type { ResultadoRepositorio } from "@/repositories/base/tipos";
import type { ModuloNodexa } from "@/services/admin/tipos";

export const CLIENTES_POR_PAGINA = 20;

export interface FilaModuloTenant {
  modulo: ModuloNodexa;
  activo: boolean;
}

export interface FilaClienteListado {
  cliente_id: string;
  nombre_comercio: string;
  slug: string;
  estado_pago: boolean;
  limite_sku: number;
  creado_en: string;
  tenant_modules: FilaModuloTenant[];
}

export interface FilaClienteDetalle extends FilaClienteListado {
  telefono_whatsapp: string;
  packs_sku_contratados: number;
  dominio_personalizado: string | null;
}

interface ResultadoListadoClientes {
  clientes: FilaClienteListado[];
  total: number;
  porPagina: number;
}

/**
 * Listado paginado de comercios para /admin/clientes (docs/ROLES.md §2, fila
 * "clientes (propio tenant)": admin_nodexa lee todos los tenants vía
 * es_admin_nodexa() en la política clientes_select). Usa `.range()` en vez de
 * traer todo el listado: nunca hace SELECT sin LIMIT (CLAUDE.md §4
 * "escalabilidad"). Los módulos activos se traen embebidos vía la FK de
 * tenant_modules en una sola query, no N+1.
 */
export async function listarClientesPaginado(
  supabase: SupabaseClient,
  pagina: number,
): Promise<ResultadoRepositorio<ResultadoListadoClientes>> {
  const paginaSegura = Number.isInteger(pagina) && pagina > 0 ? pagina : 1;
  const desde = (paginaSegura - 1) * CLIENTES_POR_PAGINA;
  const hasta = desde + CLIENTES_POR_PAGINA - 1;

  const { data, error, count } = await supabase
    .from("clientes")
    .select(
      "cliente_id, nombre_comercio, slug, estado_pago, limite_sku, creado_en, tenant_modules(modulo, activo)",
      { count: "exact" },
    )
    .is("eliminado_en", null)
    .order("creado_en", { ascending: false })
    .range(desde, hasta)
    .returns<FilaClienteListado[]>();

  if (error || !data) {
    return { ok: false, error: "NX-SYS-001" };
  }

  return { ok: true, data: { clientes: data, total: count ?? 0, porPagina: CLIENTES_POR_PAGINA } };
}

/**
 * Detalle de un comercio (SITEMAP.md: "Detalle: estado_pago, tenant_modules,
 * limite_sku"). No distingue "no existe" de "cliente_id con formato inválido"
 * — ambos casos retornan NX-SYS-004, evitando filtrar información interna.
 */
export async function obtenerClientePorId(
  supabase: SupabaseClient,
  clienteId: string,
): Promise<ResultadoRepositorio<FilaClienteDetalle>> {
  const { data, error } = await supabase
    .from("clientes")
    .select(
      "cliente_id, nombre_comercio, slug, estado_pago, limite_sku, packs_sku_contratados, telefono_whatsapp, dominio_personalizado, creado_en, tenant_modules(modulo, activo)",
    )
    .eq("cliente_id", clienteId)
    .is("eliminado_en", null)
    .single<FilaClienteDetalle>();

  if (error || !data) {
    return { ok: false, error: "NX-SYS-004" };
  }

  return { ok: true, data };
}

export interface FilaClientePublico {
  cliente_id: string;
  nombre_comercio: string;
  slug: string;
  logo_url: string | null;
  color_primario: string | null;
  telefono_whatsapp: string;
}

/**
 * Resuelve `clienteSlug -> cliente` para la vidriera pública (docs/BACKLOG.md
 * "Página estática con ISR de vidriera pública"), vía la política RLS
 * `clientes_lectura_publica` (solo comercios con `estado_pago = true` y no
 * eliminados). No distingue "el slug no existe" de "el comercio está
 * suspendido" — ambos casos caen en el mismo `NX-WEB-004`, mismo criterio
 * que `verificarPertenenciaTenant` de no filtrar existencia de recursos
 * (docs/ROLES.md §3.8). Selecciona únicamente columnas seguras para
 * exponer públicamente — nunca `packs_sku_contratados`, `ia_consultas_usadas`
 * ni otras columnas administrativas, aunque RLS ya filtre filas (RLS no
 * filtra columnas).
 */
export async function obtenerClientePublicoPorSlug(
  supabase: SupabaseClient,
  clienteSlug: string,
): Promise<ResultadoRepositorio<FilaClientePublico>> {
  const { data, error } = await supabase
    .from("clientes")
    .select("cliente_id, nombre_comercio, slug, logo_url, color_primario, telefono_whatsapp")
    .eq("slug", clienteSlug)
    .eq("estado_pago", true)
    .is("eliminado_en", null)
    .maybeSingle<FilaClientePublico>();

  if (error || !data) {
    return { ok: false, error: "NX-WEB-004" };
  }

  return { ok: true, data };
}
