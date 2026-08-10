export interface EstadoRegistrarEntradaStock {
  error: string | null;
  exito: boolean;
}

export const ESTADO_REGISTRAR_ENTRADA_STOCK_INICIAL: EstadoRegistrarEntradaStock = { error: null, exito: false };
