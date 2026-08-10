import { NextResponse, type NextRequest } from "next/server";

import { obtenerMensajeError } from "@/lib/errores/catalogo";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { MOVIMIENTOS_STOCK_POR_PAGINA, obtenerMovimientosStockPaginados } from "@/repositories/movimientosStockRepository";
import type { RolUsuario } from "@/services/autenticacion/tipos";

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
  cliente_id: string | null;
}

function respuestaError(codigo: string, status: number) {
  return NextResponse.json({ codigo, mensaje: obtenerMensajeError(codigo) }, { status });
}

/**
 * Route Handler de listado paginado de movimientos de stock (docs/BACKLOG.md
 * "Vista de movimientos de stock con TanStack Query"), consumido desde el
 * cliente vía TanStack Query en app/(app)/stock/movimientos-stock.tsx. Mismo
 * criterio que `GET /api/productos`: `/stock` ya está en el matcher del
 * proxy global (`src/proxy.ts`), pero ese middleware no cubre `/api/*`, así
 * que acá se repite la validación de sesión + rol como autorización
 * primaria de este endpoint, no defensa en profundidad opcional.
 *
 * `productoId` es un filtro opcional de query string (docs/ROLES.md §2,
 * fila "movimientos_stock": `C·L` para comerciante y empleado) que habilita
 * el camino indexado por `idx_movstock_producto` en el repositorio.
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
  const porPagina =
    Number.parseInt(searchParams.get("porPagina") ?? String(MOVIMIENTOS_STOCK_POR_PAGINA), 10) ||
    MOVIMIENTOS_STOCK_POR_PAGINA;
  const productoId = searchParams.get("productoId") ?? undefined;

  const resultado = await obtenerMovimientosStockPaginados(supabase, solicitante.cliente_id, pagina, porPagina, productoId);

  if (!resultado.ok) {
    return respuestaError(resultado.error, 500);
  }

  return NextResponse.json(resultado.data);
}
