export interface EstadoAlternarPublicacionProducto {
  error: string | null;
  exito: boolean;
}

export const ESTADO_ALTERNAR_PUBLICACION_PRODUCTO_INICIAL: EstadoAlternarPublicacionProducto = {
  error: null,
  exito: false,
};

export interface EstadoActualizarIdentidadVisual {
  error: string | null;
  exito: boolean;
}

export const ESTADO_ACTUALIZAR_IDENTIDAD_VISUAL_INICIAL: EstadoActualizarIdentidadVisual = {
  error: null,
  exito: false,
};
