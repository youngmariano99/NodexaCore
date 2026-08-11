import { NextResponse, type NextRequest } from "next/server";

import { cuotaIaAgotada } from "@/lib/dominio/cargaIa/validarCuotaIa";
import { obtenerMensajeError } from "@/lib/errores/catalogo";
import { extraerDatosEtiqueta } from "@/lib/openai/extraerDatosEtiqueta";
import { verificarCargaIaLimiter } from "@/lib/rate-limit/cargaIaLimiter";
import { subirImagenComoWebp } from "@/repositories/imagenesRepository";
import { registrarCargaIa, registrarConsumoIa } from "@/repositories/cargasIaRepository";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { RolUsuario } from "@/services/autenticacion/tipos";

const CARPETA_CARGAS_IA = "nodexa/cargas-ia";
const ANCHO_MAXIMO_PX = 1600;
const TIPOS_MIME_PERMITIDOS = new Set(["image/jpeg", "image/png", "image/webp"]);

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaModuloCargaIa {
  activo: boolean;
}

interface FilaClienteCuotaIa {
  ia_consultas_usadas: number;
  cuota_mensual_ia: number;
}

function respuestaError(codigo: string, status: number, detalle?: Record<string, unknown>) {
  return NextResponse.json({ codigo, mensaje: obtenerMensajeError(codigo), ...detalle }, { status });
}

/**
 * Route Handler de "Alta de producto por foto de etiqueta" (docs/BACKLOG.md
 * "Route Handler de procesamiento de imagen con OpenAI Vision"). Igual que
 * `/api/productos/importar`, `/api/*` no está cubierto por el matcher del
 * proxy global (`src/proxy.ts`), así que la validación de sesión + rol de
 * acá es la autorización primaria del endpoint.
 *
 * Orden de los guards, de más barato a más caro (Fail-Fast antes de gastar
 * en Cloudinary/OpenAI): sesión → rol/tenant → rate limit (NX-SYS-005,
 * ráfagas) → formato de archivo (NX-IA-004) → módulo activo (NX-IA-001) →
 * cuota mensual, en dos capas (NX-IA-002) → subida a Cloudinary
 * (NX-PRD-005) → extracción con OpenAI Vision (NX-IA-003).
 *
 * Las dos capas de cuota (docs/BACKLOG.md "Validación de cuota mensual de IA
 * antes de invocar OpenAI"): (1) una lectura simple de
 * `clientes.ia_consultas_usadas`/`cuota_mensual_ia` + `cuotaIaAgotada()`
 * (Fail-Fast, corta ANTES de gastar siquiera el round-trip del RPC en el
 * camino feliz — "verificar antes de invocar OpenAI" del Paso 1 literal); y
 * (2) el RPC atómico `fn_registrar_consumo_ia`, que sigue siendo la única
 * fuente de verdad bajo concurrencia (reserva el cupo ANTES de subir a
 * Cloudinary o llamar a OpenAI) — mismo patrón "chequeo aditivo, RPC
 * autoritativo" ya usado por `calcularNuevoSaldo` sobre
 * `fn_registrar_movimiento_stock`. La lectura previa puede quedar
 * desactualizada por una carga concurrente entre el `SELECT` y el `UPDATE`
 * del RPC; en ese caso el RPC igual rechaza con el mismo `NX-IA-002`.
 *
 * La cuota ya se consumió si Cloudinary o OpenAI fallan después del RPC: es
 * el costo real de haber intentado la operación (el cupo mensual modela
 * "intentos", no solo "éxitos"), documentado también en
 * `fn_registrar_consumo_ia`.
 *
 * `cargas_ia` (Paso 4) se registra en cualquier resultado que haya llegado a
 * subir la imagen a Cloudinary (siempre hay `imagen_url`, columna NOT NULL):
 * `resultado_extraido` queda `NULL` si la extracción falló.
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
    .select("usuario_id, rol, cliente_id")
    .eq("auth_user_id", usuarioAutenticado.id)
    .is("eliminado_en", null)
    .single<FilaUsuarioSolicitante>();

  if (errorSolicitante || !solicitante) {
    return respuestaError("NX-SYS-001", 500);
  }

  if ((solicitante.rol !== "comerciante" && solicitante.rol !== "empleado") || !solicitante.cliente_id) {
    return respuestaError("NX-SYS-003", 403);
  }

  const clienteId = solicitante.cliente_id;

  const limite = await verificarCargaIaLimiter(clienteId);

  if (!limite.permitido) {
    return respuestaError("NX-SYS-005", 429, { reintentarEnSegundos: limite.reintentarEnSegundos });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return respuestaError("NX-IA-004", 400);
  }

  const imagen = formData.get("imagen");

  if (!(imagen instanceof File) || !TIPOS_MIME_PERMITIDOS.has(imagen.type)) {
    return respuestaError("NX-IA-004", 400, { formatosPermitidos: ["image/jpeg", "image/png", "image/webp"] });
  }

  const { data: moduloCargaIa } = await supabase
    .from("tenant_modules")
    .select("activo")
    .eq("cliente_id", clienteId)
    .eq("modulo", "carga_ia")
    .maybeSingle<FilaModuloCargaIa>();

  if (!moduloCargaIa?.activo) {
    return respuestaError("NX-IA-001", 403);
  }

  const { data: clienteCuota, error: errorClienteCuota } = await supabase
    .from("clientes")
    .select("ia_consultas_usadas, cuota_mensual_ia")
    .eq("cliente_id", clienteId)
    .single<FilaClienteCuotaIa>();

  if (errorClienteCuota || !clienteCuota) {
    return respuestaError("NX-SYS-001", 500);
  }

  if (cuotaIaAgotada(clienteCuota.ia_consultas_usadas, clienteCuota.cuota_mensual_ia)) {
    return respuestaError("NX-IA-002", 429, {
      iaConsultasUsadas: clienteCuota.ia_consultas_usadas,
      cuotaMensualIa: clienteCuota.cuota_mensual_ia,
    });
  }

  const consumo = await registrarConsumoIa(supabase);

  if (!consumo.ok) {
    const status = consumo.error === "NX-IA-002" ? 429 : consumo.error === "NX-SYS-007" ? 403 : 500;
    return respuestaError(consumo.error, status);
  }

  const bytesImagen = Buffer.from(await imagen.arrayBuffer());
  const subida = await subirImagenComoWebp(bytesImagen, { carpeta: CARPETA_CARGAS_IA, anchoMaximo: ANCHO_MAXIMO_PX });

  if (!subida.ok) {
    return respuestaError(subida.error, 502);
  }

  const extraccion = await extraerDatosEtiqueta(subida.data.url);

  const cargaRegistrada = await registrarCargaIa(supabase, {
    clienteId,
    usuarioId: solicitante.usuario_id,
    imagenUrl: subida.data.url,
    resultadoExtraido: extraccion.ok ? { ...extraccion.data } : null,
  });

  if (!extraccion.ok) {
    return respuestaError(extraccion.error, 502, { alternarAltaManual: true });
  }

  if (!cargaRegistrada.ok) {
    return respuestaError(cargaRegistrada.error, 500);
  }

  return NextResponse.json({
    cargaIaId: cargaRegistrada.data.carga_ia_id,
    nombre: extraccion.data.nombre,
    precio: extraccion.data.precio,
    categoria: extraccion.data.categoria,
    imagenUrl: subida.data.url,
  });
}
