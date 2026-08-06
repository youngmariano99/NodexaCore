"use client";

import { enviarEventoNodriza } from "@/lib/analytics/nave-nodriza";

/**
 * Espejo local del ENUM modulo_nodexa (docs/SCHEMA.md §1). No se importa desde
 * tipos generados de Supabase porque esos aún no existen en el proyecto.
 */
type ModuloNodexa = "catalogo_web" | "carga_ia" | "fiados" | "devoluciones" | "bot_whatsapp";

/**
 * Nota de tenancy: el `client_id` que viaja en el nivel superior del payload de
 * Nave Nodriza identifica a "Nodexa Core" como el catálogo satélite registrado
 * en su panel (NEXT_PUBLIC_NN_CLIENT_ID). El `cliente_id` de estas funciones es
 * un concepto distinto: el comercio multi-tenant propio de Nodexa (SCHEMA.md
 * `clientes.slug`). Por eso viaja dentro de `metadata`, como propiedad
 * segmentable, no reemplazando al client_id de nivel superior.
 */

export interface PropiedadesClicWhatsapp {
  clienteId: string;
  productoId: string;
  productoNombre: string;
  precio?: number;
}

export function registrarClicWhatsapp(propiedades: PropiedadesClicWhatsapp): void {
  enviarEventoNodriza("clic_whatsapp", {
    cliente_id: propiedades.clienteId,
    producto_id: propiedades.productoId,
    producto_nombre: propiedades.productoNombre,
    precio: propiedades.precio ?? null,
  });
}

export interface PropiedadesConversionCatalogo {
  clienteId: string;
}

export function registrarConversionCatalogo(propiedades: PropiedadesConversionCatalogo): void {
  enviarEventoNodriza("conversion_catalogo", {
    cliente_id: propiedades.clienteId,
  });
}

export interface PropiedadesUsoModulo {
  clienteId: string;
  modulo: ModuloNodexa;
  accion: string;
}

export function registrarUsoModulo(propiedades: PropiedadesUsoModulo): void {
  enviarEventoNodriza("uso_modulo", {
    cliente_id: propiedades.clienteId,
    modulo: propiedades.modulo,
    accion: propiedades.accion,
  });
}
