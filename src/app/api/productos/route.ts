import { NextResponse, type NextRequest } from "next/server";

import { obtenerMensajeError } from "@/lib/errores/catalogo";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { obtenerProductosPaginados, PRODUCTOS_POR_PAGINA } from "@/repositories/productosRepository";
import type { RolUsuario } from "@/services/autenticacion/tipos";

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
  cliente_id: string | null;
}

function respuestaError(codigo: string, status: number) {
  return NextResponse.json({ codigo, mensaje: obtenerMensajeError(codigo) }, { status });
}

/**
 * Route Handler de listado paginado de productos (docs/SITEMAP.md
 * "/api/productos → Route Handler: listado paginado / mutaciones"),
 * consumido desde el cliente vía TanStack Query en
 * app/(app)/productos/listado-productos.tsx. `/productos/:path*` ya está
 * en el matcher del proxy global (src/proxy.ts), pero ese middleware no
 * cubre `/api/*`, así que acá se repite la validación de sesión + rol como
 * única barrera real para este endpoint — no es defensa en profundidad
 * opcional, es la autorización primaria.
 */
export async function GET(request: NextRequest) {
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

  if ((solicitante.rol !== "comerciante" && solicitante.rol !== "empleado") || !solicitante.cliente_id) {
    return respuestaError("NX-SYS-003", 403);
  }

  const { searchParams } = new URL(request.url);
  const pagina = Number.parseInt(searchParams.get("pagina") ?? "1", 10) || 1;
  const porPagina = Number.parseInt(searchParams.get("porPagina") ?? String(PRODUCTOS_POR_PAGINA), 10) || PRODUCTOS_POR_PAGINA;

  const resultado = await obtenerProductosPaginados(supabase, solicitante.cliente_id, pagina, porPagina);

  if (!resultado.ok) {
    return respuestaError(resultado.error, 500);
  }

  return NextResponse.json(resultado.data);
}
