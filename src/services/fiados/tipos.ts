export interface EstadoActualizarConfiguracionRiesgo {
  error: string | null;
  exito: boolean;
}

export const ESTADO_ACTUALIZAR_CONFIGURACION_RIESGO_INICIAL: EstadoActualizarConfiguracionRiesgo = {
  error: null,
  exito: false,
};
