export interface EstadoCrearProducto {
  error: string | null;
  exito: boolean;
}

export const ESTADO_CREAR_PRODUCTO_INICIAL: EstadoCrearProducto = { error: null, exito: false };
