import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

import { obtenerEntornoServidor } from "@/lib/env";
import type { ResultadoRepositorio } from "@/repositories/base/tipos";

export interface ImagenSubida {
  url: string;
  bytes: number;
  ancho: number;
  alto: number;
  formato: string;
}

export interface OpcionesSubidaImagen {
  carpeta: string;
  anchoMaximo: number;
}

/**
 * Configura el SDK de Cloudinary leyendo las credenciales de forma perezosa
 * (`obtenerEntornoServidor()`) recién al subir una imagen — nunca al
 * importar el módulo, para no exigir estas variables en flujos que no suben
 * imágenes. `cloudinary.config()` solo asigna propiedades sobre un objeto de
 * configuración en memoria del proceso (no abre conexión ni hace red), así
 * que repetirlo en cada subida es barato y evita mantener un flag de estado
 * "ya configurado" que complicaría los tests sin necesidad real.
 */
function configurarCliente(): void {
  const entorno = obtenerEntornoServidor();

  cloudinary.config({
    cloud_name: entorno.CLOUDINARY_CLOUD_NAME,
    api_key: entorno.CLOUDINARY_API_KEY,
    api_secret: entorno.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function transformacionWebp(anchoMaximo: number) {
  return [{ width: anchoMaximo, crop: "limit" }, { fetch_format: "webp", quality: "auto:eco" }];
}

function subirBuffer(buffer: Buffer, opciones: OpcionesSubidaImagen): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const flujoSubida = cloudinary.uploader.upload_stream(
      { folder: opciones.carpeta, format: "webp", transformation: transformacionWebp(opciones.anchoMaximo) },
      (error, resultado) => {
        if (error || !resultado) {
          reject(error ?? new Error("Cloudinary no devolvió un resultado de subida."));
          return;
        }
        resolve(resultado);
      },
    );
    flujoSubida.end(buffer);
  });
}

function subirCadena(origen: string, opciones: OpcionesSubidaImagen): Promise<UploadApiResponse> {
  return cloudinary.uploader.upload(origen, {
    folder: opciones.carpeta,
    format: "webp",
    transformation: transformacionWebp(opciones.anchoMaximo),
  });
}

/**
 * Abstrae el SDK de Cloudinary detrás del patrón Repository (docs/BACKLOG.md
 * "Pipeline de compresión WebP vía Cloudinary", Paso 2): ningún componente
 * de UI ni el servicio de dominio (`comprimirImagen.ts`) importa `cloudinary`
 * directamente, solo este archivo. Acepta tanto un `Buffer` (imagen subida
 * desde un formulario, vía `upload_stream`) como un `string` (URL remota o
 * data URI, vía `upload` directo) para no forzar al llamador a materializar
 * un Buffer cuando ya tiene una URL.
 *
 * Cualquier fallo de la API de Cloudinary (credenciales inválidas, timeout,
 * archivo corrupto, etc.) se normaliza a `NX-PRD-005` (docs/ERRORS.md) sin
 * propagar el error crudo del SDK — el llamador nunca ve detalles técnicos
 * de un proveedor externo.
 */
export async function subirImagenComoWebp(
  origen: Buffer | string,
  opciones: OpcionesSubidaImagen,
): Promise<ResultadoRepositorio<ImagenSubida>> {
  try {
    configurarCliente();

    const resultado = Buffer.isBuffer(origen)
      ? await subirBuffer(origen, opciones)
      : await subirCadena(origen, opciones);

    return {
      ok: true,
      data: {
        url: resultado.secure_url,
        bytes: resultado.bytes,
        ancho: resultado.width,
        alto: resultado.height,
        formato: resultado.format,
      },
    };
  } catch {
    return { ok: false, error: "NX-PRD-005" };
  }
}
