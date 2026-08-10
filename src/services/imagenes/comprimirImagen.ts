import * as Sentry from "@sentry/nextjs";

import { subirImagenComoWebp } from "@/repositories/imagenesRepository";
import type { ResultadoRepositorio } from "@/repositories/base/tipos";

/** docs/BACKLOG.md: "format: webp, width: 1080, peso objetivo ~70KB". */
export const ANCHO_MAXIMO_PX = 1080;
export const PESO_OBJETIVO_BYTES = 70 * 1024;
/**
 * Cloudinary no expone un parámetro de "peso exacto en bytes" en su
 * transformación: `quality: 'auto:eco'` + el límite de ancho son la
 * aproximación real al objetivo. Por eso el resultado se valida después de
 * subir en vez de antes; 1.5x el objetivo es la tolerancia a partir de la
 * cual se considera una desviación significativa (criterio de aceptación
 * "no supera significativamente el objetivo").
 */
const TOLERANCIA_PESO_OBJETIVO = 1.5;
const CARPETA_PRODUCTOS = "nodexa/productos";

export interface ImagenComprimida {
  url: string;
  bytes: number;
  ancho: number;
  alto: number;
}

/**
 * Comprime y almacena la imagen de un producto (docs/BACKLOG.md "Pipeline de
 * compresión WebP vía Cloudinary"). No importa el SDK de Cloudinary: delega
 * en `imagenesRepository.ts` (patrón Repository, Paso 2 del checklist), así
 * el componente de UI que eventualmente invoque este servicio nunca queda
 * acoplado al proveedor externo (Criterio de Aceptación 3).
 *
 * Si el peso final supera significativamente el objetivo de 70KB, no se
 * bloquea el alta de producto — la imagen ya quedó comprimida a WebP y es
 * igualmente utilizable — pero se reporta a Sentry para seguimiento, mismo
 * criterio de "no romper el flujo principal ante una desviación no crítica"
 * que ya usa `registrarDiff.ts` ante fallos de la auditoría asíncrona.
 */
export async function comprimirImagenProducto(
  origen: Buffer | string,
): Promise<ResultadoRepositorio<ImagenComprimida>> {
  const resultado = await subirImagenComoWebp(origen, {
    carpeta: CARPETA_PRODUCTOS,
    anchoMaximo: ANCHO_MAXIMO_PX,
  });

  if (!resultado.ok) {
    return resultado;
  }

  if (resultado.data.bytes > PESO_OBJETIVO_BYTES * TOLERANCIA_PESO_OBJETIVO) {
    Sentry.captureMessage("Imagen de producto comprimida supera significativamente el peso objetivo de 70KB", {
      level: "warning",
      tags: { modulo: "imagenesRepository" },
      extra: { bytesResultantes: resultado.data.bytes, pesoObjetivoBytes: PESO_OBJETIVO_BYTES },
    });
  }

  return {
    ok: true,
    data: {
      url: resultado.data.url,
      bytes: resultado.data.bytes,
      ancho: resultado.data.ancho,
      alto: resultado.data.alto,
    },
  };
}
