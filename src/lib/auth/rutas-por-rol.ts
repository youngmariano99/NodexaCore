import type { RolUsuario } from "@/services/autenticacion/tipos";

/**
 * Ruta de destino según docs/ROLES.md §1: admin_nodexa es soporte global
 * (no opera el día a día), comerciante/empleado operan su propio tenant.
 * Compartida entre el Server Action de login y el middleware de sesión
 * para que ambos coincidan sin duplicar el mapeo.
 */
export const RUTA_POR_ROL: Record<RolUsuario, string> = {
  admin_nodexa: "/admin",
  comerciante: "/dashboard",
  empleado: "/dashboard",
};
