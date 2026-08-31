import { z } from "zod";

/**
 * Limpia y convierte formatos numéricos/moneda en string (locales ARS o estándar) a tipo Number de JS.
 * Soporta formatos: "30.000,50", "30000.50", "30000,50", "$ 30.000,50", "30.000", 30000, etc.
 */
export function transformarNumeroLocal(valor: unknown): number {
  if (typeof valor === "number") return valor;
  if (typeof valor !== "string") return NaN;
  const trimmed = valor.trim();
  if (trimmed === "") return NaN;

  // Remover símbolo $ y espacios iniciales
  const sinMoneda = trimmed.replace(/^\$\s*/, "");

  // Si contiene coma y punto (ej: 30.000,50 o 30,000.50)
  if (sinMoneda.includes(",") && sinMoneda.includes(".")) {
    const ultimoPunto = sinMoneda.lastIndexOf(".");
    const ultimaComa = sinMoneda.lastIndexOf(",");
    if (ultimaComa > ultimoPunto) {
      // Formato argentino/europeo: 30.000,50 -> quitar puntos y cambiar coma por punto
      const normalizado = sinMoneda.replace(/\./g, "").replace(",", ".");
      return Number(normalizado);
    } else {
      // Formato anglosajón: 30,000.50 -> quitar comas
      const normalizado = sinMoneda.replace(/,/g, "");
      return Number(normalizado);
    }
  }

  // Si contiene solo comas (ej: 30000,50 o 30,50)
  if (sinMoneda.includes(",")) {
    return Number(sinMoneda.replace(/,/g, "."));
  }

  // Si contiene solo puntos
  if (sinMoneda.includes(".")) {
    const partes = sinMoneda.split(".");
    if (partes.length > 2) {
      // Múltiples puntos: 1.000.000 -> separador de miles
      return Number(sinMoneda.replace(/\./g, ""));
    }
    // Si tiene 1 punto seguido de exactamente 3 dígitos (ej: 30.000), se interpreta como miles en contexto ARS
    if (partes[1].length === 3) {
      return Number(sinMoneda.replace(/\./g, ""));
    }
    return Number(sinMoneda);
  }

  return Number(sinMoneda);
}

/**
 * Sanitiza números de teléfono eliminando espacios, guiones, paréntesis y puntos.
 * Normaliza cadenas vacías o no válidas a null.
 */
export function transformarTelefono(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim().replace(/[\s\-\(\)\.]/g, "");
  return limpio.length > 0 ? limpio : null;
}

/**
 * Schema Zod reutilizable para moneda / precio positivo o cero (>= 0).
 */
export const zMonedaNoNegativa = (
  mensajeObligatorio: string = "El monto es obligatorio.",
  mensajeNoNegativo: string = "El monto no puede ser negativo.",
) =>
  z.preprocess(
    transformarNumeroLocal,
    z.number({ message: mensajeObligatorio, invalid_type_error: mensajeObligatorio }).min(0, mensajeNoNegativo),
  );

/**
 * Schema Zod reutilizable para montos estrictamente positivos (> 0).
 */
export const zMonedaPositiva = (
  mensajeObligatorio: string = "El monto es obligatorio.",
  mensajePositivo: string = "El monto debe ser mayor a cero.",
) =>
  z.preprocess(
    transformarNumeroLocal,
    z.number({ message: mensajeObligatorio, invalid_type_error: mensajeObligatorio }).positive(mensajePositivo),
  );

/**
 * Schema Zod reutilizable para teléfonos opcionales sanitizados.
 */
export const zTelefonoOpcional = () =>
  z
    .string()
    .nullish()
    .transform(transformarTelefono)
    .refine((val) => val === null || /^\+?[1-9]\d{7,14}$/.test(val), {
      message: "El formato del teléfono no es válido.",
    });

/**
 * Schema Zod reutilizable para teléfonos obligatorios sanitizados.
 */
export const zTelefonoObligatorio = (mensajeObligatorio: string = "El teléfono de WhatsApp es obligatorio.") =>
  z
    .string({ message: mensajeObligatorio })
    .transform(transformarTelefono)
    .refine((val) => val !== null && /^\+?[1-9]\d{7,14}$/.test(val), {
      message: "Ingresá el teléfono en formato internacional, ej. +5492920000000.",
    });
