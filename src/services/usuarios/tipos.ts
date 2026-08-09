export interface EstadoCrearUsuario {
  error: string | null;
  exito: boolean;
}

export const ESTADO_CREAR_USUARIO_INICIAL: EstadoCrearUsuario = { error: null, exito: false };
