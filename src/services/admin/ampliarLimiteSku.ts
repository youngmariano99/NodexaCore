"use server";

import { z } from "zod";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { ResultadoRepositorio } from "@/repositories/base/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

/**
 * Tamaño fijo del "Pack de Catálogo Extendido" (docs/ERRORS.md NX-PRD-001,
 * docs/SEED.md §1: Bazar Casa Sur tiene limite_sku=2000 = 1000 base + 1 pack).
 * No hay tabla de planes/precios en docs/SCHEMA.md todavía: se modela como
 * constante de negocio hasta que exista esa entidad.
 */
const TAMANIO_PACK_SKU = 1000;

const esquemaAmpliarLimiteSku = z.object({
  clienteId: z.string().uuid("El cliente_id debe ser un UUID válido."),
  nuevoLimiteSku: z
    .number({ message: "El nuevo límite de SKU es obligatorio." })
    .int("El nuevo límite de SKU debe ser un número entero.")
    .positive("El nuevo límite de SKU debe ser mayor a cero."),
});

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
}

interface FilaCliente {
  limite_sku: number;
  packs_sku_contratados: number;
}

interface ResultadoAmpliarLimiteSku {
  limiteSku: number;
  packsSkuContratados: number;
  packsAgregados: number;
}

/**
 * Ampliación de `limite_sku` (docs/ROLES.md §2, fila "Ampliación limite_sku /
 * cuota IA": M exclusivo de admin_nodexa). El UPDATE corre con el cliente de
 * sesión: `clientes_update_admin` (docs/ROLES.md §3.6) ya autoriza
 * es_admin_nodexa() para modificar limite_sku, sin necesitar service_role.
 *
 * El conteo de SKUs activos contra el que se valida NX-ADM-003 es dinámico
 * (depende de `productos` en el momento de la llamada), por eso el chequeo
 * vive como regla de negocio explícita después de leer el conteo — Zod valida
 * únicamente la forma del input (UUID, entero positivo), no puede conocer un
 * valor que depende de una consulta a otra tabla.
 *
 * "Sumar el valor del pack al próximo período de facturación" (Paso 4) se
 * modela acumulando `packs_sku_contratados` en vez de un monto: no existe
 * todavía una entidad de facturación/planes en docs/SCHEMA.md que persista
 * montos, así que este contador es la base sobre la que una estación futura
 * de facturación puede calcular abono_base + packs_sku_contratados * precio.
 * Solo se suman packs ante un aumento real del límite; una reducción no resta
 * packs ya contratados (se dan de baja por un flujo de cancelación aparte).
 */
export async function ampliarLimiteSku(
  clienteId: string,
  nuevoLimiteSku: number,
): Promise<ResultadoRepositorio<ResultadoAmpliarLimiteSku>> {
  const resultado = esquemaAmpliarLimiteSku.safeParse({ clienteId, nuevoLimiteSku });

  if (!resultado.success) {
    return { ok: false, error: "NX-SYS-006" };
  }

  const supabase = await crearClienteSupabaseServidor();

  const {
    data: { user: usuarioAutenticado },
  } = await supabase.auth.getUser();

  if (!usuarioAutenticado) {
    return { ok: false, error: "NX-SYS-002" };
  }

  const { data: solicitante, error: errorSolicitante } = await supabase
    .from("usuarios")
    .select("usuario_id, rol")
    .eq("auth_user_id", usuarioAutenticado.id)
    .is("eliminado_en", null)
    .single<FilaUsuarioSolicitante>();

  if (errorSolicitante || !solicitante) {
    return { ok: false, error: "NX-SYS-001" };
  }

  if (solicitante.rol !== "admin_nodexa") {
    return { ok: false, error: "NX-SYS-003" };
  }

  const { data: cliente, error: errorCliente } = await supabase
    .from("clientes")
    .select("limite_sku, packs_sku_contratados")
    .eq("cliente_id", resultado.data.clienteId)
    .is("eliminado_en", null)
    .single<FilaCliente>();

  if (errorCliente || !cliente) {
    return { ok: false, error: "NX-SYS-004" };
  }

  const { count: conteoSkuActivos, error: errorConteo } = await supabase
    .from("productos")
    .select("producto_id", { count: "exact", head: true })
    .eq("cliente_id", resultado.data.clienteId)
    .is("eliminado_en", null);

  if (errorConteo || conteoSkuActivos === null) {
    return { ok: false, error: "NX-SYS-001" };
  }

  if (resultado.data.nuevoLimiteSku < conteoSkuActivos) {
    return { ok: false, error: "NX-ADM-003" };
  }

  const limiteAnterior = cliente.limite_sku;
  const packsAgregados =
    resultado.data.nuevoLimiteSku > limiteAnterior
      ? Math.ceil((resultado.data.nuevoLimiteSku - limiteAnterior) / TAMANIO_PACK_SKU)
      : 0;
  const packsSkuContratados = cliente.packs_sku_contratados + packsAgregados;

  const { data: clienteActualizado, error: errorActualizacion } = await supabase
    .from("clientes")
    .update({ limite_sku: resultado.data.nuevoLimiteSku, packs_sku_contratados: packsSkuContratados })
    .eq("cliente_id", resultado.data.clienteId)
    .select("limite_sku, packs_sku_contratados")
    .single<FilaCliente>();

  if (errorActualizacion || !clienteActualizado) {
    return { ok: false, error: "NX-SYS-001" };
  }

  registrarDiff({
    clienteId: resultado.data.clienteId,
    usuarioId: solicitante.usuario_id,
    tablaAfectada: "clientes",
    registroId: resultado.data.clienteId,
    campoModificado: "limite_sku",
    valorAnterior: String(limiteAnterior),
    valorNuevo: String(resultado.data.nuevoLimiteSku),
  });

  return {
    ok: true,
    data: {
      limiteSku: clienteActualizado.limite_sku,
      packsSkuContratados: clienteActualizado.packs_sku_contratados,
      packsAgregados,
    },
  };
}
