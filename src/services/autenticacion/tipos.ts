export interface EstadoLogin {
  error: string | null;
}

export const ESTADO_LOGIN_INICIAL: EstadoLogin = { error: null };

export type RolUsuario = "admin_nodexa" | "comerciante" | "empleado";

/**
 * Custom claims inyectados por custom_access_token_hook (docs/ROLES.md §3.1).
 * `cliente_id` es null únicamente para admin_nodexa.
 */
export interface ClaimsSesion {
  sub: string;
  cliente_id: string | null;
  rol: RolUsuario;
  iat: number;
  exp: number;
}
