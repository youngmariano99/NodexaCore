import type { SupabaseClient } from "@supabase/supabase-js";

import { calcularPorcentajeUsoSku } from "@/lib/dominio/productos/calcularPorcentajeUsoSku";
import type { ResultadoRepositorio } from "@/repositories/base/tipos";

const CODIGO_UNIQUE_VIOLATION_POSTGRES = "23505";

export const PRODUCTOS_POR_PAGINA = 25;

export interface FilaProductoListado {
  producto_id: string;
  sku: string;
  nombre: string;
  categoria: string | null;
  precio: number;
  stock_actual: number;
  publicado: boolean;
  imagen_url?: string | null;
}

export interface ResultadoProductosPaginados {
  productos: FilaProductoListado[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface DatosNuevoProducto {
  clienteId: string;
  sku: string;
  nombre: string;
  precio: number;
  categoria: string;
  imagenUrl?: string | null;
  productoPadreId?: string | null;
}

export interface FilaProducto {
  producto_id: string;
  cliente_id: string;
  sku: string;
  nombre: string;
  precio: number;
  categoria: string | null;
  imagen_url?: string | null;
  producto_padre_id?: string | null;
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

export interface UsoSku {
  activos: number;
  limiteSku: number;
  porcentaje: number;
}

/**
 * Uso de SKU frente al límite contratado (docs/SITEMAP.md "Widget de
 * consumo en /configuracion/facturacion", Paso 1). Combina
 * `contarProductosActivos` (ya existente, estación de `crearProducto`) con
 * `clientes.limite_sku` y `calcularPorcentajeUsoSku` (ya existente, estación
 * del aviso de 90%, `/dashboard`) en una sola función — mismo cálculo que ya
 * usa `/dashboard`, consolidado acá bajo el nombre que pide el checklist de
 * esta actividad en vez de duplicar la consulta combinada en cada página que
 * lo necesite.
 */
export async function obtenerPorcentajeUsoSku(
  supabase: SupabaseClient,
  clienteId: string,
): Promise<ResultadoRepositorio<UsoSku>> {
  const [{ data: cliente, error: errorCliente }, conteoActivos] = await Promise.all([
    supabase.from("clientes").select("limite_sku").eq("cliente_id", clienteId).single<{ limite_sku: number }>(),
    contarProductosActivos(supabase, clienteId),
  ]);

  if (errorCliente || !cliente) {
    return { ok: false, error: "NX-SYS-001" };
  }

  if (!conteoActivos.ok) {
    return { ok: false, error: conteoActivos.error };
  }

  return {
    ok: true,
    data: {
      activos: conteoActivos.data,
      limiteSku: cliente.limite_sku,
      porcentaje: calcularPorcentajeUsoSku(conteoActivos.data, cliente.limite_sku),
    },
  };
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
      imagen_url: datos.imagenUrl,
      producto_padre_id: datos.productoPadreId,
    })
    .select("producto_id, cliente_id, sku, nombre, precio, categoria, imagen_url, producto_padre_id")
    .single<FilaProducto>();

  if (error || !data) {
    if (esUniqueViolation(error)) {
      return { ok: false, error: "NX-PRD-002" };
    }
    return { ok: false, error: "NX-SYS-001" };
  }

  return { ok: true, data };
}

export interface DatosProductoImportado {
  sku: string;
  nombre: string;
  precio: number;
  categoria: string;
}

export interface FilaProductoInsertadoLote {
  producto_id: string;
  sku: string;
}

/**
 * Inserción en lote de la importación de catálogo por Excel
 * (docs/BACKLOG.md "Route Handler de importación de catálogo por Excel",
 * Paso 3: "Ejecutar inserts en lote"). Usa el mismo patrón que
 * `activarModulosIniciales` (estación de onboarding): `upsert(...,
 * { onConflict: 'cliente_id,sku', ignoreDuplicates: true })` en vez de un
 * `insert` simple envuelto en try/catch de `23505`. Esto genera un único
 * `INSERT ... ON CONFLICT (cliente_id, sku) DO NOTHING RETURNING ...`
 * atómico: si una fila del lote ya existe en el tenant, Postgres la omite
 * sin abortar el resto de la sentencia (a diferencia de un `INSERT`
 * multi-fila común, que revierte el lote completo ante cualquier violación
 * de UNIQUE). `RETURNING` con `DO NOTHING` únicamente devuelve las filas que
 * efectivamente se insertaron, lo que le permite al llamador (route handler
 * de importación) diferenciar por SKU qué filas del reporte fueron altas
 * reales y cuáles se rechazaron por ya existir en el catálogo del tenant.
 */
export async function insertarProductosEnLote(
  supabase: SupabaseClient,
  clienteId: string,
  productos: DatosProductoImportado[],
): Promise<ResultadoRepositorio<FilaProductoInsertadoLote[]>> {
  if (productos.length === 0) {
    return { ok: true, data: [] };
  }

  const { data, error } = await supabase
    .from("productos")
    .upsert(
      productos.map((producto) => ({
        cliente_id: clienteId,
        sku: producto.sku,
        nombre: producto.nombre,
        precio: producto.precio,
        categoria: producto.categoria,
      })),
      { onConflict: "cliente_id,sku", ignoreDuplicates: true },
    )
    .select("producto_id, sku")
    .returns<FilaProductoInsertadoLote[]>();

  if (error || !data) {
    return { ok: false, error: "NX-SYS-001" };
  }

  return { ok: true, data };
}

export const LIMITE_BUSQUEDA_PRODUCTOS = 10;

export interface FilaProductoBusqueda {
  producto_id: string;
  sku: string;
  nombre: string;
  precio: number;
  stock_actual: number;
}

/**
 * El filtro `.or()` de PostgREST usa `,`/`(`/`)` como caracteres de control
 * de su propia sintaxis (separador de condiciones y agrupación) — un
 * término de búsqueda que los contenga rompería el filtro compuesto en vez
 * de buscarse literalmente. Ningún SKU/nombre real de este dominio los
 * necesita, así que se descartan directamente en vez de intentar un
 * escapado con comillas (más frágil de mantener correcto). `%`/`_` son
 * wildcards de `LIKE`/`ILIKE`: se escapan para que, por ejemplo, buscar
 * "50%" no matchee cualquier cosa que empiece con "50".
 */
function sanitizarTerminoBusqueda(termino: string): string {
  return termino.replace(/[,()]/g, "").trim();
}

function escaparComodinesLike(valor: string): string {
  return valor.replace(/[%_\\]/g, (caracter) => `\\${caracter}`);
}

/**
 * Búsqueda de productos por `sku` o `nombre` para el buscador del Mostrador
 * (docs/BACKLOG.md "Componente de búsqueda y carrito en Panel de Ventas").
 * Acotada con `.limit()` en vez de paginada: es un buscador tipo-adelante
 * (autocomplete) para armar el carrito, no un listado a recorrer — nunca un
 * `SELECT *` sin límite (CLAUDE.md §4 "escalabilidad"). Un término vacío
 * (o que queda vacío tras sanitizarse) retorna `[]` sin consultar la base.
 */
export async function buscarProductosParaVenta(
  supabase: SupabaseClient,
  clienteId: string,
  termino: string,
  limite: number = LIMITE_BUSQUEDA_PRODUCTOS,
): Promise<ResultadoRepositorio<FilaProductoBusqueda[]>> {
  const terminoSanitizado = sanitizarTerminoBusqueda(termino);

  if (terminoSanitizado.length === 0) {
    return { ok: true, data: [] };
  }

  const limiteSeguro = Number.isInteger(limite) && limite > 0 ? Math.min(limite, LIMITE_BUSQUEDA_PRODUCTOS) : LIMITE_BUSQUEDA_PRODUCTOS;
  const patron = `%${escaparComodinesLike(terminoSanitizado)}%`;

  const { data, error } = await supabase
    .from("productos")
    .select("producto_id, sku, nombre, precio, stock_actual")
    .eq("cliente_id", clienteId)
    .is("eliminado_en", null)
    .or(`sku.ilike.${patron},nombre.ilike.${patron}`)
    .order("nombre", { ascending: true })
    .limit(limiteSeguro)
    .returns<FilaProductoBusqueda[]>();

  if (error || !data) {
    return { ok: false, error: "NX-SYS-001" };
  }

  return { ok: true, data };
}

export interface FilaPrecioProducto {
  producto_id: string;
  precio: number;
}

/**
 * Precios reales (autoritativos) de un lote de productos, scopeados al
 * tenant (docs/BACKLOG.md "Cálculo automático del total de la venta", Paso 3:
 * "validación final" en servidor). Usado por
 * `POST /api/ventas/previsualizar` para recalcular el total de una venta
 * SIN confiar en ningún `precioUnitario` que pueda llegar desde el cliente —
 * un usuario podría manipular el request y mandar precios distintos a los
 * reales; acá siempre se lee el `precio` vigente en `productos`. Un producto
 * eliminado lógicamente o de otro tenant simplemente no aparece en el
 * resultado, sin distinguir el motivo (mismo criterio de
 * `verificarPertenenciaTenant`, docs/ROLES.md §3.8).
 */
export async function obtenerPreciosProductosPorIds(
  supabase: SupabaseClient,
  clienteId: string,
  productoIds: string[],
): Promise<ResultadoRepositorio<FilaPrecioProducto[]>> {
  if (productoIds.length === 0) {
    return { ok: true, data: [] };
  }

  const { data, error } = await supabase
    .from("productos")
    .select("producto_id, precio")
    .eq("cliente_id", clienteId)
    .is("eliminado_en", null)
    .in("producto_id", productoIds)
    .returns<FilaPrecioProducto[]>();

  if (error || !data) {
    return { ok: false, error: "NX-SYS-001" };
  }

  return { ok: true, data };
}

/**
 * Listado paginado de productos activos de un tenant (docs/SITEMAP.md
 * "/productos → Listado paginado de productos (Core)"). Usa `.range()`
 * sobre un `count: "exact"` — nunca un `SELECT *` sin `LIMIT`
 * (CLAUDE.md §4 "escalabilidad") — y filtra siempre `eliminado_en IS NULL`:
 * un producto dado de baja lógica (`eliminarProducto.ts`) nunca aparece acá.
 *
 * El `order()` incluye `producto_id` como desempate: varias filas insertadas
 * en el mismo lote comparten literalmente el mismo `creado_en` (Postgres
 * evalúa `DEFAULT now()` una sola vez por sentencia en un INSERT masivo, no
 * por fila), y ordenar solo por una columna con empates hace que Postgres no
 * garantice el mismo orden entre dos ejecuciones de `.range()` distintas —
 * verificado en vivo contra el seed volumétrico: sin el desempate, la misma
 * fila podía aparecer repetida en dos páginas consecutivas.
 */
export async function obtenerProductosPaginados(
  supabase: SupabaseClient,
  clienteId: string,
  pagina: number,
  porPagina: number = PRODUCTOS_POR_PAGINA,
): Promise<ResultadoRepositorio<ResultadoProductosPaginados>> {
  const paginaSegura = Number.isInteger(pagina) && pagina > 0 ? pagina : 1;
  const porPaginaSeguro = Number.isInteger(porPagina) && porPagina > 0 ? porPagina : PRODUCTOS_POR_PAGINA;
  const desde = (paginaSegura - 1) * porPaginaSeguro;
  const hasta = desde + porPaginaSeguro - 1;

  const { data, error, count } = await supabase
    .from("productos")
    .select("producto_id, sku, nombre, categoria, precio, stock_actual, publicado, imagen_url", { count: "exact" })
    .eq("cliente_id", clienteId)
    .is("eliminado_en", null)
    .order("creado_en", { ascending: false })
    .order("producto_id", { ascending: true })
    .range(desde, hasta)
    .returns<FilaProductoListado[]>();

  if (error || !data) {
    return { ok: false, error: "NX-SYS-001" };
  }

  return {
    ok: true,
    data: { productos: data, total: count ?? 0, pagina: paginaSegura, porPagina: porPaginaSeguro },
  };
}

const TAMANIO_PAGINA_EXPORTACION = 500;
const LIMITE_ITERACIONES_EXPORTACION = 200; // tope defensivo: 200 * 500 = 100.000 productos

/**
 * Trae el catálogo activo completo de un tenant paginando internamente
 * sobre `obtenerProductosPaginados` (docs/SITEMAP.md "/api/export → Route
 * Handler de exportación de productos", Paso 1). Nunca hace un
 * `SELECT` sin límite (CLAUDE.md §4): en vez de una sola consulta gigante
 * que podría hacer timeout con catálogos de miles de productos (Criterio de
 * Aceptación 4), acumula páginas de `TAMANIO_PAGINA_EXPORTACION` filas hasta
 * agotar el total real reportado por Postgres. El tope de iteraciones es
 * puramente defensivo (nunca debería alcanzarse con un tenant real) para
 * que un bug futuro en el criterio de corte no derive en un loop infinito.
 */
export async function obtenerTodosLosProductosActivos(
  supabase: SupabaseClient,
  clienteId: string,
): Promise<ResultadoRepositorio<FilaProductoListado[]>> {
  const productos: FilaProductoListado[] = [];
  let pagina = 1;

  while (pagina <= LIMITE_ITERACIONES_EXPORTACION) {
    const resultado = await obtenerProductosPaginados(supabase, clienteId, pagina, TAMANIO_PAGINA_EXPORTACION);

    if (!resultado.ok) {
      return resultado;
    }

    productos.push(...resultado.data.productos);

    const seAgotoElTotal = productos.length >= resultado.data.total;
    const ultimaPaginaIncompleta = resultado.data.productos.length < TAMANIO_PAGINA_EXPORTACION;

    if (seAgotoElTotal || ultimaPaginaIncompleta) {
      break;
    }

    pagina += 1;
  }

  return { ok: true, data: productos };
}

export const PRODUCTOS_PUBLICOS_POR_PAGINA = 24;

export interface FilaProductoPublico {
  producto_id: string;
  sku: string;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  precio: number;
  imagen_url: string | null;
}

export interface ResultadoProductosPublicosPaginados {
  productos: FilaProductoPublico[];
  total: number;
  pagina: number;
  porPagina: number;
}

/**
 * Catálogo público de un comercio (docs/BACKLOG.md "Página estática con ISR
 * de vidriera pública", Paso 2). El filtro real de seguridad es la política
 * RLS `productos_lectura_publica` (`publicado = true AND eliminado_en IS
 * NULL`, docs/SCHEMA.md §18) — a diferencia de esa política, que no conoce
 * ningún tenant, esta consulta agrega `cliente_id` explícito: sin ese
 * filtro, la vidriera de un comercio mostraría los productos publicados de
 * TODOS los comercios, porque `productos_lectura_publica` está deliberadamente
 * scopeada solo por fila pública, no por tenant. `.eq('publicado', true)` y
 * `.is('eliminado_en', null)` se repiten acá como defensa en profundidad
 * explícita (mismo criterio que el resto del repo: nunca confiar
 * únicamente en RLS), aunque ya sean redundantes con la política.
 */
export async function obtenerProductosPublicadosPaginados(
  supabase: SupabaseClient,
  clienteId: string,
  pagina: number,
  porPagina: number = PRODUCTOS_PUBLICOS_POR_PAGINA,
): Promise<ResultadoRepositorio<ResultadoProductosPublicosPaginados>> {
  const paginaSegura = Number.isInteger(pagina) && pagina > 0 ? pagina : 1;
  const porPaginaSeguro = Number.isInteger(porPagina) && porPagina > 0 ? porPagina : PRODUCTOS_PUBLICOS_POR_PAGINA;
  const desde = (paginaSegura - 1) * porPaginaSeguro;
  const hasta = desde + porPaginaSeguro - 1;

  const { data, error, count } = await supabase
    .from("productos")
    .select("producto_id, sku, nombre, descripcion, categoria, precio, imagen_url", { count: "exact" })
    .eq("cliente_id", clienteId)
    .eq("publicado", true)
    .is("eliminado_en", null)
    .order("creado_en", { ascending: false })
    .order("producto_id", { ascending: true })
    .range(desde, hasta)
    .returns<FilaProductoPublico[]>();

  if (error || !data) {
    return { ok: false, error: "NX-SYS-001" };
  }

  return {
    ok: true,
    data: { productos: data, total: count ?? 0, pagina: paginaSegura, porPagina: porPaginaSeguro },
  };
}

/**
 * Ficha pública de un único producto (docs/BACKLOG.md "Componente de CTA
 * WhatsApp en ficha de producto", Paso 1). Mismo criterio de la vidriera:
 * `productos_lectura_publica` (RLS) no conoce el tenant, así que
 * `cliente_id` se filtra explícito acá para no traer un producto de otro
 * comercio si por error se pisara un `producto_id` ajeno en la URL —
 * `publicado = true` y `eliminado_en IS NULL` también explícitos, mismo
 * criterio de no confiar únicamente en RLS. No distingue "no existe" de
 * "no está publicado" de "es de otro tenant": los tres casos retornan
 * `NX-WEB-004` desde la page (vía `notFound()`), mismo criterio de no
 * filtrar existencia de recursos que ya usa `verificarPertenenciaTenant`.
 */
export async function obtenerProductoPublicoPorId(
  supabase: SupabaseClient,
  clienteId: string,
  productoId: string,
): Promise<ResultadoRepositorio<FilaProductoPublico>> {
  const { data, error } = await supabase
    .from("productos")
    .select("producto_id, sku, nombre, descripcion, categoria, precio, imagen_url")
    .eq("producto_id", productoId)
    .eq("cliente_id", clienteId)
    .eq("publicado", true)
    .is("eliminado_en", null)
    .maybeSingle<FilaProductoPublico>();

  if (error || !data) {
    return { ok: false, error: "NX-WEB-004" };
  }

  return { ok: true, data };
}
