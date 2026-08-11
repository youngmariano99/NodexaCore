import "server-only";

import { z } from "zod";

import { obtenerEntornoServidor } from "@/lib/env";
import type { ResultadoRepositorio } from "@/repositories/base/tipos";

const ENDPOINT_CHAT_COMPLETIONS = "https://api.openai.com/v1/chat/completions";
const MODELO_VISION = "gpt-4o-mini";

export interface DatosExtraidosEtiqueta {
  nombre: string;
  precio: number;
  categoria: string;
}

const esquemaRespuestaModelo = z.object({
  legible: z.boolean(),
  nombre: z.string().trim().min(1).nullable(),
  precio: z.number().min(0).nullable(),
  categoria: z.string().trim().min(1).nullable(),
});

const esquemaJsonModelo = {
  name: "datos_etiqueta_producto",
  schema: {
    type: "object",
    properties: {
      legible: {
        type: "boolean",
        description: "false si la foto está borrosa, cortada o no muestra una etiqueta de producto legible.",
      },
      nombre: { type: ["string", "null"] },
      precio: { type: ["number", "null"] },
      categoria: {
        type: ["string", "null"],
        description: "Categoría comercial general del producto (ej. Almacén, Bebidas, Limpieza, Ferretería).",
      },
    },
    required: ["legible", "nombre", "precio", "categoria"],
    additionalProperties: false,
  },
  strict: true,
};

const INSTRUCCION_SISTEMA =
  "Sos un asistente que extrae datos de productos a partir de una foto de su etiqueta de precio o empaque, " +
  "para un comercio minorista argentino. Devolvé nombre, precio (en pesos argentinos, sin símbolo de moneda) y " +
  "categoría comercial general del producto. Si la imagen está borrosa, cortada, no corresponde a una etiqueta " +
  "de producto, o no podés leer los datos con confianza, marcá legible=false y dejá los demás campos en null.";

interface RespuestaChatCompletions {
  choices?: { message?: { content?: string } }[];
}

/**
 * Extrae `nombre`, `precio` y `categoria` de una foto de etiqueta vía OpenAI
 * Vision (docs/BACKLOG.md "Route Handler de procesamiento de imagen con
 * OpenAI Vision", Paso 2). Recibe una URL pública de la imagen (ya subida a
 * Cloudinary por el llamador, nunca el archivo crudo) para no duplicar el
 * manejo de multipart/Buffer acá.
 *
 * `response_format: json_schema` con `strict: true` fuerza al modelo a
 * devolver exactamente esta forma — igual se revalida con Zod (Paso 3,
 * "Validar el resultado antes de prellenar el formulario") como defensa en
 * profundidad ante una respuesta inesperada del proveedor, sin confiar
 * ciegamente en que el `strict` mode nunca falle.
 *
 * Cualquier fallo (red, timeout, HTTP no-2xx, JSON no parseable, Zod
 * inválido, `legible=false` o algún campo en null) colapsa a `NX-IA-003`
 * (docs/ERRORS.md: "Integración OpenAI / 502") sin propagar el detalle
 * crudo del proveedor — el llamador solo necesita saber que hay que ofrecer
 * la alternancia a alta manual.
 */
export async function extraerDatosEtiqueta(imagenUrl: string): Promise<ResultadoRepositorio<DatosExtraidosEtiqueta>> {
  const entorno = obtenerEntornoServidor();

  let respuesta: Response;
  try {
    respuesta = await fetch(ENDPOINT_CHAT_COMPLETIONS, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${entorno.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODELO_VISION,
        messages: [
          { role: "system", content: INSTRUCCION_SISTEMA },
          {
            role: "user",
            content: [
              { type: "text", text: "Extraé los datos del producto de esta foto de etiqueta." },
              { type: "image_url", image_url: { url: imagenUrl } },
            ],
          },
        ],
        response_format: { type: "json_schema", json_schema: esquemaJsonModelo },
      }),
    });
  } catch {
    return { ok: false, error: "NX-IA-003" };
  }

  if (!respuesta.ok) {
    return { ok: false, error: "NX-IA-003" };
  }

  let cuerpo: RespuestaChatCompletions;
  try {
    cuerpo = await respuesta.json();
  } catch {
    return { ok: false, error: "NX-IA-003" };
  }

  const contenidoCrudo = cuerpo.choices?.[0]?.message?.content;

  if (!contenidoCrudo) {
    return { ok: false, error: "NX-IA-003" };
  }

  let contenidoParseado: unknown;
  try {
    contenidoParseado = JSON.parse(contenidoCrudo);
  } catch {
    return { ok: false, error: "NX-IA-003" };
  }

  const resultado = esquemaRespuestaModelo.safeParse(contenidoParseado);

  if (!resultado.success) {
    return { ok: false, error: "NX-IA-003" };
  }

  const { legible, nombre, precio, categoria } = resultado.data;

  if (!legible || nombre === null || precio === null || categoria === null) {
    return { ok: false, error: "NX-IA-003" };
  }

  return { ok: true, data: { nombre, precio, categoria } };
}
