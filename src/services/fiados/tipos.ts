export interface EstadoCrearClienteFinal {
  error: string | null;
  exito: boolean;
}

export const ESTADO_CREAR_CLIENTE_FINAL_INICIAL: EstadoCrearClienteFinal = { error: null, exito: false };
