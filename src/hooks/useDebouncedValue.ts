import { useEffect, useState } from "react";

/**
 * Devuelve `valor` recién `delayMs` después de su último cambio (docs/BACKLOG.md
 * "Componente de búsqueda... con debounce", Criterio de Aceptación 1: filtrar
 * sin disparar una consulta por cada tecla). Genérico y sin dependencias
 * externas — no amerita sumar una librería solo para esto.
 */
export function useDebouncedValue<T>(valor: T, delayMs: number): T {
  const [valorDebounced, setValorDebounced] = useState(valor);

  useEffect(() => {
    const temporizador = setTimeout(() => setValorDebounced(valor), delayMs);
    return () => clearTimeout(temporizador);
  }, [valor, delayMs]);

  return valorDebounced;
}
