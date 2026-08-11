import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { serializarProductosCsv } from "@/lib/exportacion/serializarProductosCsv";
import { obtenerMensajeError } from "@/lib/errores/catalogo";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { obtenerTodosLosProductosActivos } from "@/repositories/productosRepository";
import type { RolUsuario } from "@/services/autenticacion/tipos";

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
  cliente_id: string | null;
}

const esquemaFormato = z.enum(["csv", "json"]);

function respuestaError(codigo: string, status: number) {
  return NextResponse.json({ codigo, mensaje: obtenerMensajeError(codigo) }, { status });
}

/**
 * Route Handler de exportación de catálogo (docs/SITEMAP.md "/api/export →
 * Exportación CSV/JSON de catálogo y transacciones"; docs/ROLES.md §2, fila
 * "Exportación CSV/JSON (catálogo/transacciones)": `C` exclusivo de
 * `comerciante` — a diferencia de `/api/productos`, `empleado` no tiene
 * acceso acá). `/api/*` no está cubierto por el matcher de `src/proxy.ts`,
 * así que la validación de sesión + rol de este handler es la autorización
 * primaria, no defensa en profundidad.
 *
 * Defensa IDOR/BOLA (Paso 3): a diferencia de endpoints que reciben un ID de
 * recurso por parámetro, acá no existe ningún `cliente_id` controlado por
 * quien llama — la única fuente posible es `solicitante.cliente_id`,
 * resuelto de la tabla `usuarios` a partir del `auth_user_id` de la sesión
 * ya validada por Supabase Auth. `obtenerTodosLosProductosActivos` recibe
 * ese valor directamente, nunca uno leído de `searchParams` o del body:
 * no hay forma de que esta ruta exporte el catálogo de otro tenant.
 *
 * Paginación interna (Paso 1, Criterio de Aceptación 4): un catálogo de
 * miles de productos nunca se trae con un único `SELECT` sin límite
 * (CLAUDE.md §4) — `obtenerTodosLosProductosActivos` acumula páginas de 500
 * filas sobre `obtenerProductosPaginados` (mismo desempate
 * `creado_en DESC, producto_id ASC` ya verificado contra duplicados en la
 * estación del listado paginado), evitando tanto el timeout del Route
 * Handler como una consulta monolítica costosa.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const resultadoFormato = esquemaFormato.safeParse(searchParams.get("formato") ?? "csv");

  if (!resultadoFormato.success) {
    return respuestaError("NX-SYS-006", 400);
  }

  const supabase = await crearClienteSupabaseServidor();

  const {
    data: { user: usuarioAutenticado },
  } = await supabase.auth.getUser();

  if (!usuarioAutenticado) {
    return respuestaError("NX-SYS-002", 401);
  }

  const { data: solicitante, error: errorSolicitante } = await supabase
    .from("usuarios")
    .select("rol, cliente_id")
    .eq("auth_user_id", usuarioAutenticado.id)
    .is("eliminado_en", null)
    .single<FilaUsuarioSolicitante>();

  if (errorSolicitante || !solicitante) {
    return respuestaError("NX-SYS-001", 500);
  }

  if (solicitante.rol !== "comerciante" || !solicitante.cliente_id) {
    return respuestaError("NX-SYS-003", 403);
  }

  const resultadoProductos = await obtenerTodosLosProductosActivos(supabase, solicitante.cliente_id);

  if (!resultadoProductos.ok) {
    return respuestaError(resultadoProductos.error, 500);
  }

  const fechaExportacion = new Date().toISOString().slice(0, 10);

  if (resultadoFormato.data === "csv") {
    const csv = serializarProductosCsv(resultadoProductos.data);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="productos-${fechaExportacion}.csv"`,
      },
    });
  }

  return NextResponse.json(
    {
      clienteId: solicitante.cliente_id,
      total: resultadoProductos.data.length,
      exportadoEn: new Date().toISOString(),
      productos: resultadoProductos.data,
    },
    {
      headers: {
        "Content-Disposition": `attachment; filename="productos-${fechaExportacion}.json"`,
      },
    },
  );
}
