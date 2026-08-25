export interface EstadoRegistrarEntradaStock {
  error: string | null;
  exito: boolean;
}

export const ESTADO_REGISTRAR_ENTRADA_STOCK_INICIAL: EstadoRegistrarEntradaStock = { error: null, exito: false };

export interface EstadoRegistrarSalidaStock {
  error: string | null;
  exito: boolean;
}

export const ESTADO_REGISTRAR_SALIDA_STOCK_INICIAL: EstadoRegistrarSalidaStock = { error: null, exito: false };

export interface EstadoCrearProveedor {
  error: string | null;
  exito: boolean;
}

export const ESTADO_CREAR_PROVEEDOR_INICIAL: EstadoCrearProveedor = { error: null, exito: false };

