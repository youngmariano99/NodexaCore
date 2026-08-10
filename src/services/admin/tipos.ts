export interface EstadoCrearCliente {
  error: string | null;
  exito: boolean;
}

export const ESTADO_CREAR_CLIENTE_INICIAL: EstadoCrearCliente = { error: null, exito: false };
