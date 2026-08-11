export interface EstadoRegistrarDevolucion {
  error: string | null;
  exito: boolean;
  devolucionId: string | null;
}

export const ESTADO_REGISTRAR_DEVOLUCION_INICIAL: EstadoRegistrarDevolucion = {
  error: null,
  exito: false,
  devolucionId: null,
};
