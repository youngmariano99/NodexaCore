import { NextResponse, type NextRequest } from "next/server";

import { obtenerMensajeError } from "@/lib/errores/catalogo";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { buscarProductosParaVenta, LIMITE_BUSQUEDA_PRODUCTOS } from "@/repositories/productosRepository";
import type { RolUsuario } from "@/services/autenticacion/tipos";

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
  cliente_id: string | null;
}

function respuestaError(codigo: string, status: number) {
  return NextResponse.json({ codigo, mensaje: obtenerMensajeError(codigo) }, { status });
}

/**
 * Route Handler de búsqueda de productos por SKU/nombre para el buscador del
 * Mostrador (docs/BACKLOG.md "Componente de búsqueda y carrito en Panel de
 * Ventas"), consumido desde `useBuscarProductos` con debounce en
 * `app/(app)/mostrador/BuscadorProductos.tsx`. Mismo criterio que
 * `GET /api/productos`: `/mostrador` ya está en el matcher del proxy global
 * (`src/proxy.ts`), pero `/api/*` no, así que la validación de sesión + rol
 * de acá es la autorización primaria del endpoint.
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
  const termino = searchParams.get("q") ?? "";
  const limite = Number.parseInt(searchParams.get("limite") ?? String(LIMITE_BUSQUEDA_PRODUCTOS), 10) || LIMITE_BUSQUEDA_PRODUCTOS;

  const resultado = await buscarProductosParaVenta(supabase, solicitante.cliente_id, termino, limite);

  if (!resultado.ok) {
    return respuestaError(resultado.error, 500);
  }

  return NextResponse.json({ productos: resultado.data });
}
