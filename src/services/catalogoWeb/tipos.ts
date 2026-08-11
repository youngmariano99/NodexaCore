export interface EstadoAlternarPublicacionProducto {
  error: string | null;
  exito: boolean;
}

export const ESTADO_ALTERNAR_PUBLICACION_PRODUCTO_INICIAL: EstadoAlternarPublicacionProducto = {
  error: null,
  exito: false,
};
