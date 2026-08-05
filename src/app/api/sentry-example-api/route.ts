export const dynamic = "force-dynamic";

class ErrorDePruebaSentry extends Error {
  constructor() {
    super("Error de prueba de Sentry: si ves esto en el dashboard, la instrumentación funciona.");
    this.name = "ErrorDePruebaSentry";
  }
}

/**
 * Ruta exclusiva para validar el Paso 3 del ticket de Sentry: fuerza un error
 * no controlado en un Route Handler y verifica que llegue al dashboard.
 * No requiere manejo con ERRORS.md: es un throw deliberado para observabilidad,
 * no una excepción de negocio.
 */
export function GET() {
  throw new ErrorDePruebaSentry();
}
