interface Dimension {
  nombre: string;
  valores: string[];
}

interface VarianteMatriz {
  combinacion: Record<string, string>;
  sku: string;
  stock: number;
  precio: number;
}

/**
 * Genera la matriz de combinaciones (producto cartesiano) a partir de las dimensiones provistas.
 * Admite un SKU base, un precio base y un stock base por defecto.
 */
export function generarMatrizCombinaciones(
  dimensiones: Dimension[],
  skuBase: string,
  precioBase: number,
  stockBase: number,
): VarianteMatriz[] {
  if (dimensiones.length === 0) {
    return [
      {
        combinacion: {},
        sku: skuBase,
        stock: stockBase,
        precio: precioBase,
      },
    ];
  }

  const generarCartesiano = (
    list: Dimension[],
    index = 0,
    current: Record<string, string> = {},
  ): Array<Record<string, string>> => {
    if (index === list.length) {
      return [current];
    }

    const results: Array<Record<string, string>> = [];
    const dim = list[index];
    if (dim) {
      dim.valores.forEach((val) => {
        results.push(...generarCartesiano(list, index + 1, { ...current, [dim.nombre]: val }));
      });
    }

    return results;
  };

  const combinaciones = generarCartesiano(dimensiones);

  return combinaciones.map((comb) => {
    const sufijoSku = Object.values(comb)
      .map((v) => v.toUpperCase().replace(/\s+/g, ""))
      .join("-");

    return {
      combinacion: comb,
      sku: sufijoSku ? `${skuBase}-${sufijoSku}` : skuBase,
      stock: stockBase,
      precio: precioBase,
    };
  });
}
