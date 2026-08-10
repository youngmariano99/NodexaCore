import { ZodError } from "zod";

import { CATALOGO_ERRORES, obtenerMensajeError, type CodigoError } from "@/lib/errores/catalogo";

export interface ErrorMapeado {
  codigo: CodigoError;
  mensaje: string;
}

const CODIGO_FALLBACK: CodigoError = "NX-SYS-001";

/**
 * Excepción de dominio explícita: el código ya viene validado contra el
 * catálogo de docs/ERRORS.md en el punto donde se lanza (Fail-Fast). Sirve
 * para propagar un error de negocio como `throw` en vez de como valor de
 * retorno cuando conviene (ej. helpers anidados donde forzar un
 * `ResultadoRepositorio` en cada nivel intermedio solo agrega ruido).
 */
export class ErrorDeDominio extends Error {
  readonly codigo: CodigoError;

  constructor(codigo: CodigoError) {
    super(codigo);
    this.name = "ErrorDeDominio";
    this.codigo = codigo;
  }
}

function esCodigoDeCatalogo(valor: unknown): valor is CodigoError {
  return typeof valor === "string" && valor in CATALOGO_ERRORES;
}

function pareceErrorTecnicoDeBaseDeDatos(error: unknown): error is { code?: string; message: string } {
  return typeof error === "object" && error !== null && "message" in error && typeof error.message === "string";
}

/**
 * Traduce cualquier excepción (Zod, errores técnicos de Supabase/Postgres,
 * `ErrorDeDominio`, o un código ya normalizado) al par `{codigo, mensaje}`
 * de docs/ERRORS.md (CLAUDE.md §4 "trazabilidad": catálogo de errores
 * normalizado en cliente y servidor). Nunca expone `error.message` ni
 * detalles crudos de SQL (nombres de columnas, constraints): ante cualquier
 * error no reconocido explícitamente, o un código que no exista en el
 * catálogo, cae en `NX-SYS-001` — nunca se inventa un código nuevo.
 */
export function mapearError(error: unknown): ErrorMapeado {
  if (error instanceof ZodError) {
    return { codigo: "NX-SYS-006", mensaje: obtenerMensajeError("NX-SYS-006") };
  }

  if (error instanceof ErrorDeDominio) {
    return { codigo: error.codigo, mensaje: obtenerMensajeError(error.codigo) };
  }

  if (esCodigoDeCatalogo(error)) {
    return { codigo: error, mensaje: obtenerMensajeError(error) };
  }

  if (pareceErrorTecnicoDeBaseDeDatos(error)) {
    // Error técnico de Postgres/PostgREST (ej. constraint violado, columna
    // inexistente, timeout de conexión): se descarta `error.message` y
    // `error.code` a propósito, nunca deben llegar al usuario final. El
    // mapeo a un código de negocio específico (ej. NX-ADM-001 por slug
    // duplicado) es responsabilidad del llamador, que sí conoce el contexto
    // de la tabla/columna — acá solo se garantiza que nada crudo se filtre.
    return { codigo: CODIGO_FALLBACK, mensaje: obtenerMensajeError(CODIGO_FALLBACK) };
  }

  return { codigo: CODIGO_FALLBACK, mensaje: obtenerMensajeError(CODIGO_FALLBACK) };
}
