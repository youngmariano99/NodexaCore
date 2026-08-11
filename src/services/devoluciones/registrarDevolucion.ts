"use server";

import { z } from "zod";

import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { EstadoRegistrarDevolucion } from "@/services/devoluciones/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

const CODIGO_POSTGRES_NO_DATA_FOUND = "P0002";
const CODIGO_CANTIDAD_EXCEDE_VENDIDO = "NX006";
const CODIGO_VENTA_YA_DEVUELTA = "NX007";
const CODIGO_FALLO_NOTA_CREDITO = "NX008";

const esquemaItemDevolucion = z.object({
  ventaItemId: z.string().uuid(),
  cantidad: z.coerce.number().int().positive(),
});

const esquemaRegistrarDevolucion = z.object({
  ventaId: z.string().uuid("La venta es obligatoria."),
  motivo: z.string({ message: "El motivo es obligatorio." }).trim().min(1, "El motivo es obligatorio."),
  items: z.array(esquemaItemDevolucion).min(1, "La devolución necesita al menos un ítem."),
});

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaModuloDevoluciones {
  activo: boolean;
}

interface FilaDevolucion {
  devolucion_id: string;
  cliente_id: string;
  venta_id: string;
  usuario_id: string;
  motivo: string;
  estado: string;
  monto_total: number;
}

interface ErrorPostgres {
  code?: string;
}

function parsearItems(valorCrudo: FormDataEntryValue | null): unknown {
  if (typeof valorCrudo !== "string") {
    return null;
  }
  try {
    return JSON.parse(valorCrudo);
  } catch {
    return null;
  }
}

/**
 * Registro de devolución de venta (docs/ROLES.md §1: "comerciante... único
 * rol habilitado para autorizar devoluciones"; §2 nota de matriz: "empleado
 * nunca... gestiona devoluciones sin flujo de confirmación explícita del
 * comerciante" — acá se restringe directamente a `comerciante`, ya que esta
 * estación no construye ningún flujo de "solicitud pendiente" para
 * `empleado`, que quedaría para una estación futura si se pidiera).
 *
 * Paso 1 (DTO Zod): valida forma/formato de `venta_item_id`/`cantidad`
 * únicamente (UUID válido, entero positivo). La validación de negocio
 * "contra lo vendido" (`NX-DEV-002`) NO se hace acá con una lectura previa:
 * vive dentro de `fn_registrar_devolucion` (supabase/migrations/
 * 20260811170000_...), que compara contra `venta_items.cantidad` menos lo
 * ya devuelto en devoluciones previas del mismo ítem — evita la ventana de
 * carrera de dos devoluciones concurrentes sobre el mismo `venta_item`,
 * mismo criterio anti-TOCTOU que el resto de los RPC del repo.
 *
 * Paso 2 (`NX-DEV-001`): se verifica ANTES de invocar el RPC, mismo patrón
 * ya usado por `/api/carga-ia` y `crearClienteFinal.ts` para sus propios
 * módulos.
 */
export async function registrarDevolucion(
  _estadoPrevio: EstadoRegistrarDevolucion,
  formData: FormData,
): Promise<EstadoRegistrarDevolucion> {
  const resultado = esquemaRegistrarDevolucion.safeParse({
    ventaId: formData.get("venta_id"),
    motivo: formData.get("motivo"),
    items: parsearItems(formData.get("items")),
  });

  if (!resultado.success) {
    return { error: "NX-SYS-006", exito: false, devolucionId: null };
  }

  const supabase = await crearClienteSupabaseServidor();

  const {
    data: { user: usuarioAutenticado },
  } = await supabase.auth.getUser();

  if (!usuarioAutenticado) {
    return { error: "NX-SYS-002", exito: false, devolucionId: null };
  }

  const { data: solicitante, error: errorSolicitante } = await supabase
    .from("usuarios")
    .select("rol, cliente_id")
    .eq("auth_user_id", usuarioAutenticado.id)
    .is("eliminado_en", null)
    .single<FilaUsuarioSolicitante>();

  if (errorSolicitante || !solicitante) {
    return { error: "NX-SYS-001", exito: false, devolucionId: null };
  }

  if (solicitante.rol !== "comerciante" || !solicitante.cliente_id) {
    return { error: "NX-SYS-003", exito: false, devolucionId: null };
  }

  const clienteId = solicitante.cliente_id;

  const { data: moduloDevoluciones } = await supabase
    .from("tenant_modules")
    .select("activo")
    .eq("cliente_id", clienteId)
    .eq("modulo", "devoluciones")
    .maybeSingle<FilaModuloDevoluciones>();

  if (!moduloDevoluciones?.activo) {
    return { error: "NX-DEV-001", exito: false, devolucionId: null };
  }

  const { data: datoRpc, error: errorRpc } = await supabase.rpc("fn_registrar_devolucion", {
    p_venta_id: resultado.data.ventaId,
    p_motivo: resultado.data.motivo,
    p_items: resultado.data.items.map((item) => ({ venta_item_id: item.ventaItemId, cantidad: item.cantidad })),
  });
  const devolucion = datoRpc as FilaDevolucion | null;

  if (errorRpc || !devolucion) {
    const codigoPostgres = (errorRpc as ErrorPostgres | null)?.code;

    if (codigoPostgres === CODIGO_CANTIDAD_EXCEDE_VENDIDO) {
      return { error: "NX-DEV-002", exito: false, devolucionId: null };
    }
    if (codigoPostgres === CODIGO_VENTA_YA_DEVUELTA) {
      return { error: "NX-DEV-003", exito: false, devolucionId: null };
    }
    if (codigoPostgres === CODIGO_FALLO_NOTA_CREDITO) {
      return { error: "NX-DEV-004", exito: false, devolucionId: null };
    }
    if (codigoPostgres === CODIGO_POSTGRES_NO_DATA_FOUND) {
      return { error: "NX-VTA-004", exito: false, devolucionId: null };
    }
    return { error: "NX-SYS-001", exito: false, devolucionId: null };
  }

  return { error: null, exito: true, devolucionId: devolucion.devolucion_id };
}
