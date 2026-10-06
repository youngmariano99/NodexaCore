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
  tipo_producto?: "estandar" | "fabricado" | "insumo";
  recetas?: { estado_costeo: "actualizado" | "desactualizado" }[] | { estado_costeo: "actualizado" | "desactualizado" } | null;
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
  categoriaId?: string | null;
  marcaId?: string | null;
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
  categoria_id?: string | null;
  marca_id?: string | null;
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
 * Conteo de SKUs activos de un tenant (docs/SCHEMA.md Â§5, Ã­ndice
 * `idx_productos_cliente_activos`: "soporte al conteo de lÃ­mite de SKU").
 * Solo cuenta filas no eliminadas lÃ³gicamente, sin traer las filas en sÃ­
 * (`head: true`) â€” nunca un SELECT * sin LIMIT (CLAUDE.md Â§4 "escalabilidad").
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
 * Uso de SKU frente al lÃ­mite contratado (docs/SITEMAP.md "Widget de
 * consumo en /configuracion/facturacion", Paso 1). Combina
 * `contarProductosActivos` (ya existente, estaciÃ³n de `crearProducto`) con
 * `clientes.limite_sku` y `calcularPorcentajeUsoSku` (ya existente, estaciÃ³n
 * del aviso de 90%, `/dashboard`) en una sola funciÃ³n â€” mismo cÃ¡lculo que ya
 * usa `/dashboard`, consolidado acÃ¡ bajo el nombre que pide el checklist de
 * esta actividad en vez de duplicar la consulta combinada en cada pÃ¡gina que
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
 * Alta manual de producto (docs/ROLES.md Â§2, fila "productos â€” alta/ediciÃ³n/
 * baja": `C` para comerciante y empleado). Corre con el cliente de sesiÃ³n:
 * `productos_insert_tenant` (WITH CHECK cliente_id = auth_cliente_id()) no
 * distingue rol para el INSERT, a diferencia del UPDATE. El `cliente_id` se
 * fija explÃ­cito acÃ¡ (nunca confiado del DTO del cliente) como defensa en
 * profundidad adicional a la polÃ­tica RLS.
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
      categoria_id: datos.categoriaId || null,
      marca_id: datos.marcaId || null,
      imagen_url: datos.imagenUrl,
      producto_padre_id: datos.productoPadreId,
    })
    .select("producto_id, cliente_id, sku, nombre, precio, categoria, categoria_id, marca_id, imagen_url, producto_padre_id")
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
 * InserciÃ³n en lote de la importaciÃ³n de catÃ¡logo por Excel
 * (docs/BACKLOG.md "Route Handler de importaciÃ³n de catÃ¡logo por Excel",
 * Paso 3: "Ejecutar inserts en lote"). Usa el mismo patrÃ³n que
 * `activarModulosIniciales` (estaciÃ³n de onboarding): `upsert(...,
 * { onConflict: 'cliente_id,sku', ignoreDuplicates: true })` en vez de un
 * `insert` simple envuelto en try/catch de `23505`. Esto genera un Ãºnico
 * `INSERT ... ON CONFLICT (cliente_id, sku) DO NOTHING RETURNING ...`
 * atÃ³mico: si una fila del lote ya existe en el tenant, Postgres la omite
 * sin abortar el resto de la sentencia (a diferencia de un `INSERT`
 * multi-fila comÃºn, que revierte el lote completo ante cualquier violaciÃ³n
 * de UNIQUE). `RETURNING` con `DO NOTHING` Ãºnicamente devuelve las filas que
 * efectivamente se insertaron, lo que le permite al llamador (route handler
 * de importaciÃ³n) diferenciar por SKU quÃ© filas del reporte fueron altas
 * reales y cuÃ¡les se rechazaron por ya existir en el catÃ¡logo del tenant.
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
 * de su propia sintaxis (separador de condiciones y agrupaciÃ³n) â€” un
 * tÃ©rmino de bÃºsqueda que los contenga romperÃ­a el filtro compuesto en vez
 * de buscarse literalmente. NingÃºn SKU/nombre real de este dominio los
 * necesita, asÃ­ que se descartan directamente en vez de intentar un
 * escapado con comillas (mÃ¡s frÃ¡gil de mantener correcto). `%`/`_` son
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
 * BÃºsqueda de productos por `sku` o `nombre` para el buscador del Mostrador
 * (docs/BACKLOG.md "Componente de bÃºsqueda y carrito en Panel de Ventas").
 * Acotada con `.limit()` en vez de paginada: es un buscador tipo-adelante
 * (autocomplete) para armar el carrito, no un listado a recorrer â€” nunca un
 * `SELECT *` sin lÃ­mite (CLAUDE.md Â§4 "escalabilidad"). Un tÃ©rmino vacÃ­o
 * (o que queda vacÃ­o tras sanitizarse) retorna `[]` sin consultar la base.
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
    .neq("tipo_producto", "insumo")
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
 * tenant (docs/BACKLOG.md "CÃ¡lculo automÃ¡tico del total de la venta", Paso 3:
 * "validaciÃ³n final" en servidor). Usado por
 * `POST /api/ventas/previsualizar` para recalcular el total de una venta
 * SIN confiar en ningÃºn `precioUnitario` que pueda llegar desde el cliente â€”
 * un usuario podrÃ­a manipular el request y mandar precios distintos a los
 * reales; acÃ¡ siempre se lee el `precio` vigente en `productos`. Un producto
 * eliminado lÃ³gicamente o de otro tenant simplemente no aparece en el
 * resultado, sin distinguir el motivo (mismo criterio de
 * `verificarPertenenciaTenant`, docs/ROLES.md Â§3.8).
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
 * "/productos â†’ Listado paginado de productos (Core)"). Usa `.range()`
 * sobre un `count: "exact"` â€” nunca un `SELECT *` sin `LIMIT`
 * (CLAUDE.md Â§4 "escalabilidad") â€” y filtra siempre `eliminado_en IS NULL`:
 * un producto dado de baja lÃ³gica (`eliminarProducto.ts`) nunca aparece acÃ¡.
 *
 * El `order()` incluye `producto_id` como desempate: varias filas insertadas
 * en el mismo lote comparten literalmente el mismo `creado_en` (Postgres
 * evalÃºa `DEFAULT now()` una sola vez por sentencia en un INSERT masivo, no
 * por fila), y ordenar solo por una columna con empates hace que Postgres no
 * garantice el mismo orden entre dos ejecuciones de `.range()` distintas â€”
 * verificado en vivo contra el seed volumÃ©trico: sin el desempate, la misma
 * fila podÃ­a aparecer repetida en dos pÃ¡ginas consecutivas.
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
    .select("producto_id, sku, nombre, categoria, precio, stock_actual, publicado, imagen_url, tipo_producto, recetas(estado_costeo)", { count: "exact" })
    .eq("cliente_id", clienteId)
    .neq("tipo_producto", "insumo")
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

/**
 * Listado paginado exclusivo para insumos (materias primas) de un comercio
 * para la gestiÃ³n de cocina / mÃ³dulo gastronÃ³mico.
 */
export async function obtenerInsumosPaginados(
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
    .eq("tipo_producto", "insumo")
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
 * Trae el catÃ¡logo activo completo de un tenant paginando internamente
 * sobre `obtenerProductosPaginados` (docs/SITEMAP.md "/api/export â†’ Route
 * Handler de exportaciÃ³n de productos", Paso 1). Nunca hace un
 * `SELECT` sin lÃ­mite (CLAUDE.md Â§4): en vez de una sola consulta gigante
 * que podrÃ­a hacer timeout con catÃ¡logos de miles de productos (Criterio de
 * AceptaciÃ³n 4), acumula pÃ¡ginas de `TAMANIO_PAGINA_EXPORTACION` filas hasta
 * agotar el total real reportado por Postgres. El tope de iteraciones es
 * puramente defensivo (nunca deberÃ­a alcanzarse con un tenant real) para
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
 * CatÃ¡logo pÃºblico de un comercio (docs/BACKLOG.md "PÃ¡gina estÃ¡tica con ISR
 * de vidriera pÃºblica", Paso 2). El filtro real de seguridad es la polÃ­tica
 * RLS `productos_lectura_publica` (`publicado = true AND eliminado_en IS
 * NULL`, docs/SCHEMA.md Â§18) â€” a diferencia de esa polÃ­tica, que no conoce
 * ningÃºn tenant, esta consulta agrega `cliente_id` explÃ­cito: sin ese
 * filtro, la vidriera de un comercio mostrarÃ­a los productos publicados de
 * TODOS los comercios, porque `productos_lectura_publica` estÃ¡ deliberadamente
 * scopeada solo por fila pÃºblica, no por tenant. `.eq('publicado', true)` y
 * `.is('eliminado_en', null)` se repiten acÃ¡ como defensa en profundidad
 * explÃ­cita (mismo criterio que el resto del repo: nunca confiar
 * Ãºnicamente en RLS), aunque ya sean redundantes con la polÃ­tica.
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
    .neq("tipo_producto", "insumo")
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
 * Ficha pÃºblica de un Ãºnico producto (docs/BACKLOG.md "Componente de CTA
 * WhatsApp en ficha de producto", Paso 1). Mismo criterio de la vidriera:
 * `productos_lectura_publica` (RLS) no conoce el tenant, asÃ­ que
 * `cliente_id` se filtra explÃ­cito acÃ¡ para no traer un producto de otro
 * comercio si por error se pisara un `producto_id` ajeno en la URL â€”
 * `publicado = true` y `eliminado_en IS NULL` tambiÃ©n explÃ­citos, mismo
 * criterio de no confiar Ãºnicamente en RLS. No distingue "no existe" de
 * "no estÃ¡ publicado" de "es de otro tenant": los tres casos retornan
 * `NX-WEB-004` desde la page (vÃ­a `notFound()`), mismo criterio de no
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

