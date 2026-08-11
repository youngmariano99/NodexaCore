export interface EstadoLogin {
  error: string | null;
}

export const ESTADO_LOGIN_INICIAL: EstadoLogin = { error: null };

export interface EstadoRecuperarContrasena {
  error: string | null;
  enviado: boolean;
}

export const ESTADO_RECUPERAR_CONTRASENA_INICIAL: EstadoRecuperarContrasena = { error: null, enviado: false };

export type RolUsuario = "admin_nodexa" | "comerciante" | "empleado";

/**
 * Custom claims inyectados por custom_access_token_hook (docs/ROLES.md §3.1).
 * `cliente_id` es null únicamente para admin_nodexa. `estado_pago` solo viaja
 * para comerciante/empleado (`cliente_id` no nulo) — admin_nodexa nunca lo
 * lleva, mismo criterio que `cliente_id`.
 */
export interface ClaimsSesion {
  sub: string;
  cliente_id: string | null;
  rol: RolUsuario;
  estado_pago: boolean | null;
  iat: number;
  exp: number;
}
