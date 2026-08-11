export interface EstadoActualizarConfiguracionBot {
  error: string | null;
  exito: boolean;
}

export const ESTADO_ACTUALIZAR_CONFIGURACION_BOT_INICIAL: EstadoActualizarConfiguracionBot = {
  error: null,
  exito: false,
};
