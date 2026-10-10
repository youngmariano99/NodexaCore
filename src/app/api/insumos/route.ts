import { NextResponse, type NextRequest } from "next/server";

import { obtenerMensajeError } from "@/lib/errores/catalogo";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { obtenerInsumosPaginados, INSUMOS_POR_PAGINA } from "@/repositories/insumosRepository";
import type { RolUsuario } from "@/services/autenticacion/tipos";

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
  cliente_id: string | null;
}

function respuestaError(codigo: string, status: number) {
  return NextResponse.json({ codigo, mensaje: obtenerMensajeError(codigo) }, { status });
}

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

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") ?? "1", 10) || 1;

  const resultado = await obtenerInsumosPaginados(supabase, solicitante.cliente_id, page, INSUMOS_POR_PAGINA);

  if (!resultado.ok || !resultado.data) {
    return respuestaError("NX-SYS-001", 500);
  }

  return NextResponse.json(resultado.data);
}
