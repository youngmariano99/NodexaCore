export interface EstadoCrearClienteFinal {
  error: string | null;
  exito: boolean;
}

export const ESTADO_CREAR_CLIENTE_FINAL_INICIAL: EstadoCrearClienteFinal = { error: null, exito: false };

export interface EstadoRegistrarPagoCuentaCorriente {
  error: string | null;
  exito: boolean;
}

export const ESTADO_REGISTRAR_PAGO_CUENTA_CORRIENTE_INICIAL: EstadoRegistrarPagoCuentaCorriente = {
  error: null,
  exito: false,
};
