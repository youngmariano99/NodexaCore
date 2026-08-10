export interface EstadoCrearProducto {
  error: string | null;
  exito: boolean;
}

export const ESTADO_CREAR_PRODUCTO_INICIAL: EstadoCrearProducto = { error: null, exito: false };

export interface EstadoActualizarProducto {
  error: string | null;
  exito: boolean;
}

export const ESTADO_ACTUALIZAR_PRODUCTO_INICIAL: EstadoActualizarProducto = { error: null, exito: false };
