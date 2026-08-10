import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { calcularSubtotalItem, calcularTotalVenta, type VentaItem } from "@/lib/dominio/ventas/calcularTotalVenta";
import { obtenerMensajeError } from "@/lib/errores/catalogo";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { obtenerPreciosProductosPorIds } from "@/repositories/productosRepository";
import type { RolUsuario } from "@/services/autenticacion/tipos";

const esquemaPrevisualizarVenta = z.object({
  items: z.array(
    z.object({
      productoId: z.string().uuid(),
      cantidad: z.coerce.number().int().positive(),
    }),
  ),
});

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
  cliente_id: string | null;
}

interface ItemVentaResuelto extends VentaItem {
  subtotal: number;
}

function respuestaError(codigo: string, status: number) {
  return NextResponse.json({ codigo, mensaje: obtenerMensajeError(codigo) }, { status });
}

/**
 * Validación final (server-side) del total de una venta antes de
 * confirmarla (docs/BACKLOG.md "Cálculo automático del total de la venta",
 * Paso 3). Recibe únicamente `producto_id` + `cantidad` por ítem — nunca un
 * `precioUnitario` desde el cliente: ese dato se resuelve acá contra
 * `productos.precio` real del tenant (`obtenerPreciosProductosPorIds`), así
 * un request manipulado con precios distintos a los reales no puede alterar
 * el total recalculado. No registra ninguna venta ni descuenta stock —eso
 * es la historia de "Confirmación de cobro con control de duplicados"
 * (Sprint 6, `POST /api/ventas`, con idempotencia), fuera del alcance de
 * esta estación, que es puramente el cálculo del total.
 *
 * Mismo criterio de autorización que el resto de `/api/productos/*`:
 * `/mostrador` está en el matcher del proxy global (`src/proxy.ts`), pero
 * `/api/*` no, así que la validación de sesión + rol de acá es la
 * autorización primaria.
 */
export async function POST(request: NextRequest) {
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

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return respuestaError("NX-SYS-006", 400);
  }

  const resultadoValidacion = esquemaPrevisualizarVenta.safeParse(cuerpo);

  if (!resultadoValidacion.success) {
    return respuestaError("NX-SYS-006", 400);
  }

  const { items } = resultadoValidacion.data;

  if (items.length === 0) {
    return NextResponse.json({ total: 0, items: [] });
  }

  const productoIds = [...new Set(items.map((item) => item.productoId))];

  const precios = await obtenerPreciosProductosPorIds(supabase, solicitante.cliente_id, productoIds);

  if (!precios.ok) {
    return respuestaError(precios.error, 500);
  }

  const precioPorProductoId = new Map(precios.data.map((fila) => [fila.producto_id, fila.precio]));

  const todosPertenecenAlTenant = productoIds.every((productoId) => precioPorProductoId.has(productoId));

  if (!todosPertenecenAlTenant) {
    return respuestaError("NX-SYS-007", 403);
  }

  const itemsResueltos: ItemVentaResuelto[] = items.map((item) => {
    const ventaItem: VentaItem = {
      productoId: item.productoId,
      // El `!` es seguro: `todosPertenecenAlTenant` ya confirmó que cada
      // `productoId` tiene entrada en el mapa antes de llegar acá.
      precioUnitario: precioPorProductoId.get(item.productoId)!,
      cantidad: item.cantidad,
    };
    return { ...ventaItem, subtotal: calcularSubtotalItem(ventaItem) };
  });

  return NextResponse.json({ total: calcularTotalVenta(itemsResueltos), items: itemsResueltos });
}
