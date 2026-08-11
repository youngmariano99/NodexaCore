import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { serializarVentasCsv } from "@/lib/exportacion/serializarVentasCsv";
import { obtenerMensajeError } from "@/lib/errores/catalogo";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { obtenerTodasLasVentasActivas, obtenerTodosLosVentaItemsActivos } from "@/repositories/ventas";
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
 * Route Handler de exportación de transacciones (docs/SITEMAP.md
 * "/api/export/ventas"; docs/ROLES.md §2, fila "Exportación CSV/JSON
 * (catálogo/transacciones)": `C` exclusivo de `comerciante`, mismo gate que
 * `/api/export/productos`). `/api/*` no está en el matcher de `src/proxy.ts`,
 * así que esta validación de sesión + rol es la autorización primaria.
 *
 * Defensa IDOR/BOLA (Paso 3, Criterio de Aceptación 4): a diferencia de
 * `/api/export/productos` (que nunca acepta un `cliente_id` externo), acá el
 * checklist pide explícitamente rechazar con `NX-SYS-007` un intento de
 * pasar un `cliente_id` ajeno por query string. Se admite el parámetro
 * opcional `clienteId` solo para poder detectar y rechazar ese intento de
 * forma explícita (en vez de ignorarlo en silencio): si viene y no coincide
 * con `solicitante.cliente_id` (resuelto de la sesión), se corta con
 * `NX-SYS-007` antes de tocar `ventas`/`venta_items`. La consulta real
 * siempre usa `solicitante.cliente_id`, nunca el valor de la query string.
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

  const clienteIdSolicitado = searchParams.get("clienteId");

  if (clienteIdSolicitado && clienteIdSolicitado !== solicitante.cliente_id) {
    return respuestaError("NX-SYS-007", 403);
  }

  const [resultadoVentas, resultadoItems] = await Promise.all([
    obtenerTodasLasVentasActivas(supabase, solicitante.cliente_id),
    obtenerTodosLosVentaItemsActivos(supabase, solicitante.cliente_id),
  ]);

  if (!resultadoVentas.ok) {
    return respuestaError(resultadoVentas.error, 500);
  }

  if (!resultadoItems.ok) {
    return respuestaError(resultadoItems.error, 500);
  }

  const fechaExportacion = new Date().toISOString().slice(0, 10);

  if (resultadoFormato.data === "csv") {
    const csv = serializarVentasCsv(resultadoVentas.data, resultadoItems.data);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ventas-${fechaExportacion}.csv"`,
      },
    });
  }

  return NextResponse.json(
    {
      clienteId: solicitante.cliente_id,
      total: { ventas: resultadoVentas.data.length, ventaItems: resultadoItems.data.length },
      exportadoEn: new Date().toISOString(),
      ventas: resultadoVentas.data,
      ventaItems: resultadoItems.data,
    },
    {
      headers: {
        "Content-Disposition": `attachment; filename="ventas-${fechaExportacion}.json"`,
      },
    },
  );
}
