import type { SupabaseClient } from "@supabase/supabase-js";

import type { ResultadoRepositorio } from "@/repositories/base/tipos";

const CODIGO_POSTGRES_NO_DATA_FOUND = "P0002";
const CODIGO_CUOTA_IA_AGOTADA = "NX005";

interface ErrorPostgres {
  code?: string;
}

export interface FilaCargaIa {
  carga_ia_id: string;
  cliente_id: string;
  usuario_id: string;
  producto_id: string | null;
  imagen_url: string;
  resultado_extraido: Record<string, unknown> | null;
  creado_en: string;
}

/**
 * Consume un cupo de la cuota mensual de Carga con IA de forma atómica
 * (docs/BACKLOG.md "Route Handler de procesamiento de imagen con OpenAI
 * Vision", NX-IA-002) vía `fn_registrar_consumo_ia`
 * (supabase/migrations/20260811100000_...). El chequeo "¿queda cuota?" y el
 * incremento viven en la misma sentencia UPDATE dentro del RPC — acá solo
 * se traduce el `SQLSTATE` custom a un código de docs/ERRORS.md, mismo
 * patrón que `registrarSalidaStock.ts` con `fn_registrar_movimiento_stock`.
 * `cliente_id` nunca se pasa como parámetro: el RPC lo resuelve internamente
 * desde el JWT de sesión (`auth_cliente_id()`), así que este `supabase` debe
 * ser el cliente de sesión del usuario, nunca el `service_role`.
 */
export async function registrarConsumoIa(supabase: SupabaseClient): Promise<ResultadoRepositorio<null>> {
  const { error } = await supabase.rpc("fn_registrar_consumo_ia");

  if (error) {
    const codigoPostgres = (error as ErrorPostgres).code;

    if (codigoPostgres === CODIGO_CUOTA_IA_AGOTADA) {
      return { ok: false, error: "NX-IA-002" };
    }
    if (codigoPostgres === CODIGO_POSTGRES_NO_DATA_FOUND) {
      return { ok: false, error: "NX-SYS-007" };
    }
    return { ok: false, error: "NX-SYS-001" };
  }

  return { ok: true, data: null };
}

export interface DatosNuevaCargaIa {
  clienteId: string;
  usuarioId: string;
  imagenUrl: string;
  resultadoExtraido: Record<string, unknown> | null;
}

/**
 * Registra una fila de auditoría de negocio en `cargas_ia` (docs/SCHEMA.md
 * §14, Paso 4 del checklist). `producto_id` siempre viaja `NULL` acá: se
 * completa recién si el usuario confirma el alta manual prellenada con este
 * resultado (fuera del alcance de esta estación, que solo procesa la
 * imagen). `resultado_extraido` llega `NULL` cuando la extracción falló
 * (imagen ilegible u otro error de OpenAI) — igual se deja registro de la
 * operación, con la foto ya subida a Cloudinary como evidencia.
 */
export async function registrarCargaIa(
  supabase: SupabaseClient,
  datos: DatosNuevaCargaIa,
): Promise<ResultadoRepositorio<FilaCargaIa>> {
  const { data, error } = await supabase
    .from("cargas_ia")
    .insert({
      cliente_id: datos.clienteId,
      usuario_id: datos.usuarioId,
      producto_id: null,
      imagen_url: datos.imagenUrl,
      resultado_extraido: datos.resultadoExtraido,
    })
    .select("carga_ia_id, cliente_id, usuario_id, producto_id, imagen_url, resultado_extraido, creado_en")
    .single<FilaCargaIa>();

  if (error || !data) {
    return { ok: false, error: "NX-SYS-001" };
  }

  return { ok: true, data };
}
