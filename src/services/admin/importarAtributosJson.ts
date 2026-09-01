import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const elementoAtributo = z.union([
  z.string().trim().min(1, "El nombre no puede estar vacío."),
  z.object({
    nombre: z.string().trim().min(1, "El nombre no puede estar vacío."),
  }),
]);

export const esquemaAtributosJson = z.object({
  marcas: z.array(elementoAtributo).optional().default([]),
  categorias: z.array(elementoAtributo).optional().default([]),
});

export type AtributosJsonEntrada = z.infer<typeof esquemaAtributosJson>;

export interface ResultadoImportacionAtributos {
  ok: boolean;
  marcasInsertadas: number;
  categoriasInsertadas: number;
  error?: string | null;
}

/**
 * Normaliza y deduplica un array de marcas o categorías preservando
 * el formato original del primer elemento encontrado pero evitando duplicados case-insensitive.
 */
export function normalizarListaAtributos(
  items: (string | { nombre: string })[] | undefined,
): string[] {
  if (!items || !Array.isArray(items)) return [];
  const nombresUnicos = new Map<string, string>();

  for (const item of items) {
    const nombre = typeof item === "string" ? item.trim() : item?.nombre?.trim();
    if (nombre && !nombresUnicos.has(nombre.toLowerCase())) {
      nombresUnicos.set(nombre.toLowerCase(), nombre);
    }
  }

  return Array.from(nombresUnicos.values());
}

/**
 * Parsea el JSON crudo de atributos y valida su estructura contra el esquema Zod.
 * Retorna null si el formato no es válido.
 */
export function parsearYValidarAtributosJson(
  valorCrudo: unknown,
): AtributosJsonEntrada | null {
  if (!valorCrudo) return null;

  let objeto: unknown = valorCrudo;
  if (typeof valorCrudo === "string") {
    const recortado = valorCrudo.trim();
    if (!recortado) return null;
    try {
      objeto = JSON.parse(recortado);
    } catch {
      return null;
    }
  }

  const resultado = esquemaAtributosJson.safeParse(objeto);
  return resultado.success ? resultado.data : null;
}

/**
 * Procesa la inserción masiva de marcas y categorías asociadas al nuevo `cliente_id`.
 * Es una operación Fail-Safe: los fallos no interrumpen la creación del comercio base.
 */
export async function importarAtributosJson(
  supabaseAdmin: SupabaseClient,
  clienteId: string,
  atributosCrudos: unknown,
): Promise<ResultadoImportacionAtributos> {
  const datosValidados = parsearYValidarAtributosJson(atributosCrudos);

  if (!datosValidados) {
    return {
      ok: false,
      marcasInsertadas: 0,
      categoriasInsertadas: 0,
      error: "El formato o la estructura del JSON de atributos es inválido.",
    };
  }

  const marcasNormalizadas = normalizarListaAtributos(datosValidados.marcas);
  const categoriasNormalizadas = normalizarListaAtributos(datosValidados.categorias);

  let marcasInsertadas = 0;
  let categoriasInsertadas = 0;

  try {
    if (marcasNormalizadas.length > 0) {
      const payloadsMarcas = marcasNormalizadas.map((nombre) => ({
        cliente_id: clienteId,
        nombre,
      }));
      const { error: errorMarcas } = await supabaseAdmin.from("marcas").insert(payloadsMarcas);
      if (!errorMarcas) {
        marcasInsertadas = marcasNormalizadas.length;
      }
    }

    if (categoriasNormalizadas.length > 0) {
      const payloadsCategorias = categoriasNormalizadas.map((nombre) => ({
        cliente_id: clienteId,
        nombre,
      }));
      const { error: errorCategorias } = await supabaseAdmin.from("categorias").insert(payloadsCategorias);
      if (!errorCategorias) {
        categoriasInsertadas = categoriasNormalizadas.length;
      }
    }

    return {
      ok: true,
      marcasInsertadas,
      categoriasInsertadas,
    };
  } catch (error) {
    return {
      ok: false,
      marcasInsertadas,
      categoriasInsertadas,
      error: error instanceof Error ? error.message : "Error inesperado al insertar atributos.",
    };
  }
}
