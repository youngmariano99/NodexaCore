/**
 * Modelo comercial escalonado decreciente para packs de ampliación de SKU
 * (docs/BACKLOG.md "Actualización del próximo período de facturación en
 * ampliaciones", docs/SCHEMA.md §17). Montos confirmados explícitamente con
 * el usuario en esta estación: no había ningún valor de referencia en
 * docs/BACKLOG.md más allá del pack 1 ($5.000) y el pack 2 ($4.000).
 */
export const COSTO_PRIMER_PACK_SKU_ARS = 5000;
export const DECREMENTO_POR_PACK_SKU_ARS = 1000;
export const COSTO_MINIMO_PACK_SKU_ARS = 2000;

/**
 * Costo del pack número `numeroPack` (1-indexado): decrece $1.000 ARS por
 * cada pack respecto del anterior, con piso de $2.000 ARS (pack 1 = $5.000,
 * pack 2 = $4.000, pack 3 = $3.000, pack 4 en adelante = $2.000).
 */
export function calcularCostoPackSku(numeroPack: number): number {
  if (!Number.isInteger(numeroPack) || numeroPack < 1) {
    throw new RangeError("numeroPack debe ser un entero mayor o igual a 1.");
  }

  const costo = COSTO_PRIMER_PACK_SKU_ARS - DECREMENTO_POR_PACK_SKU_ARS * (numeroPack - 1);
  return Math.max(costo, COSTO_MINIMO_PACK_SKU_ARS);
}

/**
 * Suma el costo de los `packsAgregados` packs nuevos contratados en una
 * misma ampliación, continuando la numeración escalonada a partir de
 * `packsPrevios` (docs/SCHEMA.md §2 `clientes.packs_sku_contratados`) — una
 * ampliación que salta varios packs a la vez (ej. de 1000 a 3000 SKU en un
 * solo pedido) paga el costo marginal real de cada pack individual, no un
 * promedio ni el costo del primero repetido.
 */
export function calcularCostoPacksSkuAgregados(packsPrevios: number, packsAgregados: number): number {
  let total = 0;

  for (let indice = 1; indice <= packsAgregados; indice += 1) {
    total += calcularCostoPackSku(packsPrevios + indice);
  }

  return total;
}

/**
 * Paquete de recarga de cuota mensual de IA (docs/ERRORS.md `NX-IA-002`,
 * "paquete de recarga (+40 consultas)"): monto fijo confirmado
 * explícitamente con el usuario, sin esquema escalonado (a diferencia de
 * los packs de SKU).
 */
export const COSTO_RECARGA_IA_ARS = 3000;
export const CUOTA_IA_POR_RECARGA = 40;
