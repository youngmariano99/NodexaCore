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

export interface EstadoEliminarProducto {
  error: string | null;
  exito: boolean;
}

export const ESTADO_ELIMINAR_PRODUCTO_INICIAL: EstadoEliminarProducto = { error: null, exito: false };

export interface EstadoCrearMarca {
  error: string | null;
  exito: boolean;
}

export const ESTADO_CREAR_MARCA_INICIAL: EstadoCrearMarca = { error: null, exito: false };
